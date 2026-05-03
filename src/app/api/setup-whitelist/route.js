import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export async function GET(request) {
    const email = request.nextUrl.searchParams.get('email');
    let connection;
    try {
        connection = await createConnection();

        console.log('Running migration: Create user_whitelist table');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_whitelist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                invited_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        let message = 'Migration successful: user_whitelist table created/exists. ';

        if (email) {
            // Check if already exists to avoid unique constraint error
            const [rows] = await connection.execute('SELECT id FROM user_whitelist WHERE email = ?', [email]);
            if (rows.length === 0) {
                await connection.execute(
                    'INSERT INTO user_whitelist (email, invited_by) VALUES (?, ?)',
                    [email, 'SYSTEM_SETUP']
                );
                message += `Successfully added ${email} to whitelist.`;
            } else {
                message += `User ${email} is already in the whitelist.`;
            }
        } else {
            message += "No email provided to whitelist (add ?email=your@email.com to whitelist).";
        }

        return NextResponse.json({ message });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ message: 'Migration failed', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
