import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export async function GET() {
    let connection;
    try {
        connection = await createConnection();

        // Check if column exists first to avoid error
        const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'jalin_alam_db' 
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'custom_attributes'
    `);

        if (columns.length > 0) {
            return NextResponse.json({ message: 'Column "custom_attributes" already exists.' });
        }

        await connection.execute(`
      ALTER TABLE products
      ADD COLUMN custom_attributes JSON DEFAULT NULL
    `);

        return NextResponse.json({ message: 'Success! Column "custom_attributes" added to products table.' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
