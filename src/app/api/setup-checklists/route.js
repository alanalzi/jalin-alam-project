import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export async function GET() {
    let connection;
    try {
        connection = await createConnection();

        // 1. Create checklist_templates table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS checklist_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 2. Create checklist_template_tasks table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS checklist_template_tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_id INT NOT NULL,
                task_name VARCHAR(255) NOT NULL,
                order_index INT DEFAULT 0,
                FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
            )
        `);

        return NextResponse.json({ message: 'Success! Checklist Template tables created.' });
    } catch (error) {
        console.error("Setup Checklists Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
