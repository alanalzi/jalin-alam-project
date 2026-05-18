import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';
import { getToken } from "next-auth/jwt";

export async function GET(req) {
    let connection;
    try {
        connection = await createConnection();
        const [rows] = await connection.execute('SELECT * FROM holidays ORDER BY date ASC');
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Failed to fetch holidays:', error);
        return NextResponse.json({ message: 'Failed to fetch holidays', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export async function POST(req) {
    let connection;
    try {
        const token = await getToken({ req });
        if (!token || (token.role !== 'direktur' && token.role !== 'admin')) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const { date, description } = await req.json();
        if (!date || !description) {
            return NextResponse.json({ message: 'Date and description are required' }, { status: 400 });
        }

        connection = await createConnection();
        await connection.execute(
            'INSERT INTO holidays (date, description) VALUES (?, ?)',
            [date, description]
        );
        
        return NextResponse.json({ message: 'Holiday added successfully' }, { status: 201 });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ message: 'Tanggal ini sudah didaftarkan sebagai hari libur.' }, { status: 409 });
        }
        console.error('Failed to add holiday:', error);
        return NextResponse.json({ message: 'Failed to add holiday', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export async function DELETE(req) {
    let connection;
    try {
        const token = await getToken({ req });
        if (!token || (token.role !== 'direktur' && token.role !== 'admin')) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json({ message: 'ID is required' }, { status: 400 });
        }

        connection = await createConnection();
        await connection.execute('DELETE FROM holidays WHERE id = ?', [id]);
        
        return NextResponse.json({ message: 'Holiday deleted successfully' });
    } catch (error) {
        console.error('Failed to delete holiday:', error);
        return NextResponse.json({ message: 'Failed to delete holiday', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
