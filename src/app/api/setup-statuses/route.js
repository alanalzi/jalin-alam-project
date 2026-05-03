import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export async function GET() {
    let connection;
    try {
        connection = await createConnection();

        // Create table
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_statuses (
        id int(11) NOT NULL AUTO_INCREMENT,
        name varchar(50) NOT NULL UNIQUE,
        color varchar(20) DEFAULT '#808080',
        order_index int(11) DEFAULT 0,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

        // Insert defaults
        const defaults = [
            ['Ongoing', '#3b82f6', 1],
            ['Late', '#ef4444', 2],
            ['Done', '#10b981', 3],
            ['Pending', '#f59e0b', 0]
        ];

        for (const [name, color, order_index] of defaults) {
            await connection.execute(
                `INSERT IGNORE INTO product_statuses (name, color, order_index) VALUES (?, ?, ?)`,
                [name, color, order_index]
            );
        }

        return NextResponse.json({ message: 'Success! Table "product_statuses" created and seeded.' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
