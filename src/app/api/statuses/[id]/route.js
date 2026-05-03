import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export async function PUT(request, context) {
    const id = (await Promise.resolve(context.params)).id;
    let connection;
    try {
        const { name, color, order_index } = await request.json();
        connection = await createConnection();

        const fields = [];
        const values = [];

        if (name !== undefined) {
            fields.push('name = ?');
            values.push(name);
        }
        if (color !== undefined) {
            fields.push('color = ?');
            values.push(color);
        }
        if (order_index !== undefined) {
            fields.push('order_index = ?');
            values.push(order_index);
        }

        if (fields.length === 0) {
            return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
        }

        await connection.execute(
            `UPDATE product_statuses SET ${fields.join(', ')} WHERE id = ?`,
            [...values, id]
        );

        return NextResponse.json({ message: 'Status updated' });
    } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export async function DELETE(request, context) {
    const id = (await Promise.resolve(context.params)).id;
    let connection;
    try {
        connection = await createConnection();
        await connection.execute('DELETE FROM product_statuses WHERE id = ?', [id]);
        return NextResponse.json({ message: 'Status deleted' });
    } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
