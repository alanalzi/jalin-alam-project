import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/lib/auth';

export async function GET(req) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'direktur') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let connection;
    try {
        connection = await createConnection();
        try {
            const [rows] = await connection.execute('SELECT * FROM user_whitelist ORDER BY created_at DESC');
            return NextResponse.json(rows);
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('Lazy creating table user_whitelist...');
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS user_whitelist (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        email VARCHAR(255) NOT NULL UNIQUE,
                        invited_by VARCHAR(255),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                const [rows] = await connection.execute('SELECT * FROM user_whitelist ORDER BY created_at DESC');
                return NextResponse.json(rows);
            }
            throw err;
        }
    } catch (error) {
        console.error('Whitelist GET error:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export async function POST(req) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'direktur') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email) {
        return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    let connection;
    try {
        connection = await createConnection();

        // Ensure table exists (Lazy check)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_whitelist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                invited_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if already registered in users table
        const [existingUser] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return NextResponse.json({ message: 'User already registered as active' }, { status: 400 });
        }

        // Check if already whitelisted
        const [existingWhitelist] = await connection.execute('SELECT id FROM user_whitelist WHERE email = ?', [email]);
        if (existingWhitelist.length > 0) {
            return NextResponse.json({ message: 'Email already in pending invitations' }, { status: 400 });
        }

        await connection.execute(
            'INSERT INTO user_whitelist (email, invited_by) VALUES (?, ?)',
            [email, session.user.email]
        );

        return NextResponse.json({ message: 'Email added to whitelist' }, { status: 201 });
    } catch (error) {
        console.error('Whitelist POST error:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export async function DELETE(req) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'direktur') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ message: 'ID is required' }, { status: 400 });
    }

    let connection;
    try {
        connection = await createConnection();
        await connection.execute('DELETE FROM user_whitelist WHERE id = ?', [id]);
        return NextResponse.json({ message: 'Whitelist entry removed' });
    } catch (error) {
        console.error('Whitelist DELETE error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
