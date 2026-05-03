import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export async function GET() {
    let connection;
    try {
        connection = await createConnection();
        const [rows] = await connection.execute('SELECT * FROM product_statuses ORDER BY order_index ASC, id ASC');
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export async function POST(request) {
    let connection;
    try {
        const { name, color } = await request.json();
        if (!name) return NextResponse.json({ message: 'Name is required' }, { status: 400 });

        connection = await createConnection();
        const [result] = await connection.execute(
            'INSERT INTO product_statuses (name, color, order_index) VALUES (?, ?, 0)',
            [name, color || '#808080']
        );

        return NextResponse.json({ message: 'Status created', id: result.insertId }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
