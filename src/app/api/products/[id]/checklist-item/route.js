// jalin-alam/src/app/api/products/[id]/checklist-item/route.js
import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export async function POST(request, context) {
  const id = (await Promise.resolve(context.params)).id;
  const { task, productId } = await request.json();

  if (!id || !task || !productId) {
    return NextResponse.json({ message: 'Product ID and task are required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await createConnection();
    await connection.beginTransaction();

    // 1. Check if the task is a template name
    const [templateRows] = await connection.execute(
      'SELECT id FROM checklist_templates WHERE name = ?',
      [task]
    );

    if (templateRows.length > 0) {
      const templateId = templateRows[0].id;
      // 2. Fetch all tasks for this template
      const [templateTasks] = await connection.execute(
        'SELECT task_name FROM checklist_template_tasks WHERE template_id = ? ORDER BY order_index ASC',
        [templateId]
      );

      if (templateTasks.length > 0) {
        // 3. Insert each task, skipping duplicates
        const insertedTasks = [];
        for (const tTask of templateTasks) {
          const [exists] = await connection.execute(
            'SELECT id FROM product_checklists WHERE product_id = ? AND task = ?',
            [productId, tTask.task_name]
          );
          
          if (exists.length === 0) {
            await connection.execute(
              'INSERT INTO product_checklists (product_id, task, percentage) VALUES (?, ?, ?)',
              [productId, tTask.task_name, 0]
            );
            insertedTasks.push(tTask.task_name);
          }
        }
        
        await connection.commit();
        return NextResponse.json({ 
          message: `Template expanded: Added ${insertedTasks.length} new tasks.`,
          added: insertedTasks 
        }, { status: 201 });
      }
    }

    // --- Standard behavior (if not a template or if it's a custom task) ---

    // Check if the product exists
    const [productRows] = await connection.execute('SELECT id FROM products WHERE id = ?', [productId]);
    if (productRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    // Check if the task already exists for this product to prevent duplicates
    const [existingTask] = await connection.execute(
      'SELECT id FROM product_checklists WHERE product_id = ? AND task = ?',
      [productId, task]
    );

    if (existingTask.length > 0) {
      await connection.rollback();
      return NextResponse.json({ message: `Task "${task}" already exists for this product` }, { status: 409 });
    }

    // Insert the new checklist item
    const [result] = await connection.execute(
      'INSERT INTO product_checklists (product_id, task, percentage) VALUES (?, ?, ?)',
      [productId, task, 0] // New tasks start with 0% completion
    );

    await connection.commit();
    return NextResponse.json({ message: 'Checklist item added successfully', id: result.insertId }, { status: 201 });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Database query failed during POST checklist item:', error);
    return NextResponse.json({ message: 'Failed to add checklist item', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
