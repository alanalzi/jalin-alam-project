import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

// GET all templates with their tasks
export async function GET() {
    let connection;
    try {
        connection = await createConnection();
        
        // Fetch all templates
        const [templates] = await connection.execute('SELECT * FROM checklist_templates ORDER BY name ASC');
        
        // Fetch all tasks
        const [tasks] = await connection.execute('SELECT * FROM checklist_template_tasks ORDER BY template_id, order_index ASC');
        
        // Map tasks into templates
        const result = templates.map(template => ({
            ...template,
            tasks: tasks.filter(task => task.template_id === template.id)
        }));
        
        return NextResponse.json(result);
    } catch (error) {
        console.error("GET Checklist Templates Error:", error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

// POST create new template
export async function POST(request) {
    let connection;
    try {
        const { name, description, tasks } = await request.json();
        connection = await createConnection();
        await connection.beginTransaction();

        // 1. Insert template
        const [templateResult] = await connection.execute(
            'INSERT INTO checklist_templates (name, description) VALUES (?, ?)',
            [name, description || '']
        );
        const templateId = templateResult.insertId;

        // 2. Insert tasks
        if (tasks && tasks.length > 0) {
            for (let i = 0; i < tasks.length; i++) {
                await connection.execute(
                    'INSERT INTO checklist_template_tasks (template_id, task_name, order_index) VALUES (?, ?, ?)',
                    [templateId, tasks[i].task_name, i]
                );
            }
        }

        await connection.commit();
        return NextResponse.json({ id: templateId, message: 'Template created successfully' }, { status: 201 });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("POST Checklist Template Error:", error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
