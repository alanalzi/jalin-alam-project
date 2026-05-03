import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export async function GET(request, context) {
    const id = (await Promise.resolve(context.params)).id;
    let connection;
    try {
        connection = await createConnection();
        const [templates] = await connection.execute('SELECT * FROM checklist_templates WHERE id = ?', [id]);
        
        if (templates.length === 0) {
            return NextResponse.json({ message: 'Template not found' }, { status: 404 });
        }

        const [tasks] = await connection.execute('SELECT * FROM checklist_template_tasks WHERE template_id = ? ORDER BY order_index ASC', [id]);
        
        return NextResponse.json({ ...templates[0], tasks });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export async function PUT(request, context) {
    const id = (await Promise.resolve(context.params)).id;
    let connection;
    try {
        const { name, description, tasks } = await request.json();
        connection = await createConnection();
        await connection.beginTransaction();

        // 1. Update template
        await connection.execute(
            'UPDATE checklist_templates SET name = ?, description = ? WHERE id = ?',
            [name, description || '', id]
        );

        // 2. Refresh tasks (Delete and Insert)
        await connection.execute('DELETE FROM checklist_template_tasks WHERE template_id = ?', [id]);
        
        if (tasks && tasks.length > 0) {
            for (let i = 0; i < tasks.length; i++) {
                await connection.execute(
                    'INSERT INTO checklist_template_tasks (template_id, task_name, order_index) VALUES (?, ?, ?)',
                    [id, tasks[i].task_name, i]
                );
            }
        }

        await connection.commit();
        return NextResponse.json({ message: 'Template updated successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export async function DELETE(request, context) {
    const id = (await Promise.resolve(context.params)).id;
    let connection;
    try {
        connection = await createConnection();
        await connection.execute('DELETE FROM checklist_templates WHERE id = ?', [id]);
        return NextResponse.json({ message: 'Template deleted successfully' });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
