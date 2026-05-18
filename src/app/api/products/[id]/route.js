// jalin-alam/src/app/api/products/[id]/route.js
import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';
import { getToken } from "next-auth/jwt";

export async function GET(request, context) {
  const formatLocalYYYYMMDD = (d) => {
    if (!d) return null;
    if (typeof d === 'string') return d.split('T')[0];
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const id = (await Promise.resolve(context.params)).id;
  console.log('GET /api/products/[id] called for ID:', id, 'Path:', request.nextUrl.pathname);

  if (!id) {
    return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await createConnection();

    // Fetch the base product to determine its type
    const [productRows] = await connection.execute(
      `SELECT id, inquiry_code, category, status, type, start_date AS startDate, deadline, completed_at, validation_status, order_quantity FROM products WHERE id = ?`,
      [id]
    );

    if (productRows.length === 0) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    const product = productRows[0];

    // Based on the product type, fetch the rest of the data from the correct source
    if (product.type === 'Custom' && product.inquiry_code) {
      // For Custom products, get live data from the inquiry
      const [inquiryRows] = await connection.execute(
        `SELECT
           i.product_name,
           i.product_description,
           i.request_date,
           i.image_deadline,
           i.customer_request,
           i.order_quantity,
           GROUP_CONCAT(ii.image_url ORDER BY ii.id ASC) AS images
         FROM inquiries i
         LEFT JOIN inquiry_images ii ON i.id = ii.inquiry_id
         WHERE i.inquiry_code = ?
         GROUP BY i.id`,
        [product.inquiry_code]
      );

      if (inquiryRows.length > 0) {
        const inquiryData = inquiryRows[0];
        // Map inquiry data to the product object
        // Map inquiry data to the product object, prioritizing already saved product dates
        product.name = inquiryData.product_name;
        product.description = inquiryData.product_description;
        product.startDate = formatLocalYYYYMMDD(product.startDate) || formatLocalYYYYMMDD(inquiryData.request_date);
        product.deadline = formatLocalYYYYMMDD(product.deadline) || formatLocalYYYYMMDD(inquiryData.image_deadline);
        product.customer_request = inquiryData.customer_request;
        product.order_quantity = inquiryData.order_quantity;
        product.images = inquiryData.images ? inquiryData.images.split(',') : [];
      } else {
        // Inquiry not found, set fields to empty/default
        product.name = 'Inquiry Data Not Found';
        product.images = [];
      }

    } else {
      // For 'New Product' or other types, get data from the products table itself
      const [fullProductRows] = await connection.execute(
        `SELECT name, description, start_date AS startDate, deadline, custom_attributes, validation_status, order_quantity FROM products WHERE id = ?`,
        [id]
      );
      if (fullProductRows.length > 0) {
        // Merge the details into the main product object
        const productData = fullProductRows[0];
        if (typeof productData.custom_attributes === 'string') {
          try {
            productData.custom_attributes = JSON.parse(productData.custom_attributes);
          } catch (e) {
            productData.custom_attributes = [];
          }
        }
        Object.assign(product, productData);
        product.startDate = formatLocalYYYYMMDD(product.startDate);
        product.deadline = formatLocalYYYYMMDD(product.deadline);
      }

      // Fetch images from the product_images table
      const [imageRows] = await connection.execute('SELECT image_url FROM product_images WHERE product_id = ?', [id]);
      product.images = imageRows.map(row => row.image_url);
    }

    // Fetch common related data (checklist, materials) for all product types
    const [checklistRows] = await connection.execute(
      'SELECT id, task, task as task_name, percentage FROM product_checklists WHERE product_id = ?',
      [parseInt(id, 10)]
    );
    product.checklist = checklistRows;

    // Calculate checklist statistics
    if (checklistRows.length > 0) {
      const totalPercentage = checklistRows.reduce((sum, row) => sum + (row.percentage || 0), 0);
      product.overallChecklistPercentage = Math.round(totalPercentage / checklistRows.length);
      product.total_tasks = checklistRows.length;
      product.completed_tasks = checklistRows.filter(row => (row.percentage || 0) === 100).length;
    } else {
      product.overallChecklistPercentage = 0;
      product.total_tasks = 0;
      product.completed_tasks = 0;
    }


    const [materialRows] = await connection.execute(`
        SELECT pm.material_id, rm.name as material_name, pm.quantity_needed,
               rm.supplier_description, rm.contact_info_text
        FROM product_materials pm
        JOIN suppliers rm ON pm.material_id = rm.id
        WHERE pm.product_id = ?`,
      [id]
    );
    product.requiredMaterials = materialRows;

    // Fetch assignees from product_assignees
    const [assigneeRows] = await connection.execute(`
      SELECT u.id, u.name, u.role
      FROM product_assignees pa
      JOIN users u ON pa.user_id = u.id
      WHERE pa.product_id = ?
    `, [id]);

    if (assigneeRows.length > 0) {
      product.assignees = assigneeRows;
    } else if (product.type === 'Custom' && product.inquiry_code) {
      // Fallback: Fetch assignees from inquiry if product-specific ones don't exist
      const [inquiryAssigneeRows] = await connection.execute(`
        SELECT u.id, u.name, u.role
        FROM inquiry_assignees ia
        JOIN inquiries i ON ia.inquiry_id = i.id
        JOIN users u ON ia.user_id = u.id
        WHERE i.inquiry_code = ?
      `, [product.inquiry_code]);
      product.assignees = inquiryAssigneeRows;
    } else {
      product.assignees = [];
    }

    return NextResponse.json(product);

  } catch (error) {
    console.error('Database query failed during GET:', error);
    return NextResponse.json({ message: 'Failed to fetch product', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function PUT(request, context) {
  const id = (await Promise.resolve(context.params)).id;
  const {
    name,
    inquiry_code, // Renamed from sku to inquiry_code
    category,
    description,
    startDate,
    deadline,
    status,
    checklist,
    requiredMaterials,
    images,
    custom_attributes,
    assignee_ids,
    order_quantity,
    customer_request
  } = await request.json();
  
  const token = await getToken({ req: request });
  if (!token || (token.role !== 'admin' && token.role !== 'direktur' && token.role !== 'RnD')) {
    return NextResponse.json({ message: 'Forbidden: Access denied' }, { status: 403 });
  }

  console.log('PUT /api/products/[id]: Incoming payload for product ID:', id);

  if (!id) {
    return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await createConnection();

    // BACKEND GUARD: Check if the product is locked (pending validation or pending edit)
    const [lockRows] = await connection.execute(
      `SELECT validation_status, inquiry_code FROM products WHERE id = ?`,
      [id]
    );
    
    if (lockRows.length > 0) {
      const p = lockRows[0];
      if (p.validation_status === 'pending' || p.validation_status === 'pending_delete') {
         return NextResponse.json({ message: 'Produk sedang dalam proses validasi. Perubahan tidak diizinkan.' }, { status: 403 });
      }
      
      // Check for pending edit requests for this product
      const [pendingEdits] = await connection.execute(
        `SELECT id FROM edit_requests WHERE target_id = ? AND target_type = 'product' AND status = 'pending'`,
        [id]
      );
      if (pendingEdits.length > 0) {
        return NextResponse.json({ message: 'Produk sedang dalam proses pengajuan edit. Tunggu validasi Direktur.' }, { status: 403 });
      }

      // Also check related inquiry if it's a custom product
      if (p.inquiry_code) {
        const [pendingInqEdits] = await connection.execute(
          `SELECT er.id FROM edit_requests er 
           JOIN inquiries i ON er.target_id = i.id 
           WHERE i.inquiry_code = ? AND er.target_type = 'inquiry' AND er.status = 'pending'`,
          [p.inquiry_code]
        );
        if (pendingInqEdits.length > 0) {
          return NextResponse.json({ message: 'Inquiry terkait sedang dalam proses pengajuan edit. Produk dikunci sementara.' }, { status: 403 });
        }
      }
    }

    await connection.beginTransaction();

    const [currentProductRows] = await connection.execute('SELECT * FROM products WHERE id = ?', [id]);
    if (currentProductRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    const currentProduct = currentProductRows[0];

    // --- Dynamically build the UPDATE query for the 'products' table ---
    const fieldsToUpdate = [];
    const values = [];

    if (name !== undefined) {
      fieldsToUpdate.push('name = ?');
      values.push(name === '' ? null : name);
    }
    if (inquiry_code !== undefined) {
      fieldsToUpdate.push('inquiry_code = ?');
      values.push(inquiry_code === '' ? null : inquiry_code);
    }
    if (category !== undefined) {
      fieldsToUpdate.push('category = ?');
      values.push(category === '' ? null : category);
    }
    if (description !== undefined) {
      fieldsToUpdate.push('description = ?');
      values.push(description === '' ? null : description);
    }
    if (startDate !== undefined) {
      fieldsToUpdate.push('start_date = ?');
      values.push(startDate === '' ? null : startDate);
    }
    if (deadline !== undefined) {
      fieldsToUpdate.push('deadline = ?');
      values.push(deadline === '' ? null : deadline);
    }
    if (status !== undefined) {
      fieldsToUpdate.push('status = ?');
      values.push(status === '' ? null : status);

      // --- Handle completed_at timestamp ---
      // If status is becoming 'completed', set completed_at
      // If status is changing from 'completed' to something else, clear it
      if (status === 'completed') {
        fieldsToUpdate.push('completed_at = CURRENT_TIMESTAMP');
      } else if (status !== undefined && status !== null) {
        // If it's a non-empty status that isn't 'completed', clear the timestamp
        fieldsToUpdate.push('completed_at = NULL');
      }
    }
    if (custom_attributes !== undefined) {
      fieldsToUpdate.push('custom_attributes = ?');
      values.push(JSON.stringify(custom_attributes));
    }
    if (order_quantity !== undefined) {
      fieldsToUpdate.push('order_quantity = ?');
      values.push(parseInt(order_quantity) || 0);
    }

    if (fieldsToUpdate.length > 0) {
      const updateProductQuery = `UPDATE products SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
      await connection.execute(updateProductQuery, [...values, id]);
      console.log('Product details updated for ID:', id);
    }

    // --- Sync to Inquiries table if this is a custom product ---
    const finalInquiryCode = inquiry_code !== undefined ? inquiry_code : currentProduct.inquiry_code;
    if (finalInquiryCode) {
      const inquiryFields = [];
      const inquiryValues = [];
      
      if (order_quantity !== undefined) {
        inquiryFields.push('order_quantity = ?');
        inquiryValues.push(parseInt(order_quantity) || 0);
      }
      if (customer_request !== undefined) {
        inquiryFields.push('customer_request = ?');
        inquiryValues.push(customer_request === '' ? null : customer_request);
      }
      if (startDate !== undefined) {
        inquiryFields.push('request_date = ?');
        inquiryValues.push(startDate === '' ? null : startDate);
      }
      if (deadline !== undefined) {
        inquiryFields.push('image_deadline = ?');
        inquiryValues.push(deadline === '' ? null : deadline);
      }
      
      if (inquiryFields.length > 0) {
        await connection.execute(
          `UPDATE inquiries SET ${inquiryFields.join(', ')} WHERE inquiry_code = ?`,
          [...inquiryValues, finalInquiryCode]
        );
        console.log(`Synced fields to Inquiry: ${finalInquiryCode}`);
      }
    }


    // --- Sync checklist if provided ---
    if (checklist !== undefined && Array.isArray(checklist)) {
      console.log('Syncing checklist for product ID:', id);
      
      // 1. Get existing task IDs
      const [existingTaskRows] = await connection.execute(
        'SELECT id FROM product_checklists WHERE product_id = ?',
        [id]
      );
      const existingTaskIds = existingTaskRows.map(row => row.id);
      
      // 2. Identify tasks to keep/update and tasks to insert
      // Safety: Only include IDs that actually belong to this product's existing checklist
      const incomingTaskWithIds = checklist.filter(t => t.id && existingTaskIds.includes(parseInt(t.id)));
      
      const incomingTaskIds = incomingTaskWithIds.map(t => parseInt(t.id));
      const tasksToInsert = checklist.filter(t => !t.id || !existingTaskIds.includes(parseInt(t.id)));
      
      // 3. Delete tasks that are no longer in the list
      const tasksToDelete = existingTaskIds.filter(id => !incomingTaskIds.includes(id));
      if (tasksToDelete.length > 0) {
        await connection.query(
          'DELETE FROM product_checklists WHERE id IN (?) AND product_id = ?',
          [tasksToDelete, id]
        );
      }
      
      // 4. Update existing tasks
      for (const item of checklist.filter(t => t.id)) {
        const taskName = (item.task || item.task_name || '').trim();
        if (!taskName) continue;
        
        await connection.execute(
          'UPDATE product_checklists SET task = ?, percentage = ? WHERE id = ? AND product_id = ?',
          [taskName, item.percentage || 0, item.id, id]
        );
      }
      
      // 5. Insert new tasks
      for (const item of tasksToInsert) {
        const taskName = (item.task || item.task_name || '').trim();
        if (!taskName) continue;

        // Check for duplicate names to prevent redundant tasks
        const [existing] = await connection.execute(
          'SELECT id FROM product_checklists WHERE product_id = ? AND task = ?',
          [id, taskName]
        );

        if (existing.length === 0) {
          await connection.execute(
            'INSERT INTO product_checklists (product_id, task, percentage) VALUES (?, ?, ?)',
            [id, taskName, item.percentage || 0]
          );
        } else {
          // If it exists but didn't have an ID in the payload, update the percentage of the existing one
          await connection.execute(
            'UPDATE product_checklists SET percentage = ? WHERE id = ?',
            [item.percentage || 0, existing[0].id]
          );
        }
      }

      // 6. Automated Audit Log for checklist update
      const totalPercentage = checklist.reduce((sum, row) => sum + (parseInt(row.percentage) || 0), 0);
      const avgPercentage = Math.round(totalPercentage / checklist.length);
      
      await connection.execute(
        'INSERT INTO product_progress_logs (product_id, comment, user_id) VALUES (?, ?, ?)',
        [id, `Automated Update: Production checklist progress updated to ${avgPercentage}% average.`, token.id]
      );
    }

    // --- Update requiredMaterials if provided ---
    if (requiredMaterials !== undefined) {
      console.log('Updating required materials for product ID:', id);
      await connection.execute('DELETE FROM product_materials WHERE product_id = ?', [id]);

      if (Array.isArray(requiredMaterials) && requiredMaterials.length > 0) {
        for (const supplier of requiredMaterials) {
          const materialId = supplier.supplier_id;
          const quantityNeeded = 1; // Default quantity

          if (materialId === undefined || materialId === null) {
            console.error('Skipping required material due to undefined materialId:', supplier);
            continue;
          }

          const [existingSupplier] = await connection.execute(
            'SELECT id FROM suppliers WHERE id = ?',
            [materialId]
          );

          if (existingSupplier.length === 0) {
            await connection.rollback();
            return NextResponse.json(
              { message: `Supplier with ID ${materialId} not found.` },
              { status: 400 }
            );
          }

          await connection.execute(
            'INSERT INTO product_materials (product_id, material_id, quantity_needed) VALUES (?, ?, ?)',
            [id, materialId, quantityNeeded]
          );
        }
      }
    }

    // --- Update images if provided ---
    if (images !== undefined) {
      console.log('Updating product images for product ID:', id);
      await connection.execute('DELETE FROM product_images WHERE product_id = ?', [id]);
      if (Array.isArray(images) && images.length > 0) {
        const imageValues = images.map(imageUrl => [id, imageUrl]);
        await connection.query(
          'INSERT INTO product_images (product_id, image_url) VALUES ?',
          [imageValues]
        );
      }
    }
    // --- Update assignees if provided ---
    if (assignee_ids !== undefined) {
      console.log('Updating product assignees for product ID:', id);
      await connection.execute('DELETE FROM product_assignees WHERE product_id = ?', [id]);
      if (Array.isArray(assignee_ids) && assignee_ids.length > 0) {
        const assigneeValues = assignee_ids.map(userId => [id, userId]);
        await connection.query(
          'INSERT INTO product_assignees (product_id, user_id) VALUES ?',
          [assigneeValues]
        );
      }
    }

    await connection.commit();
    return NextResponse.json({ message: 'Product updated successfully' });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Database query failed during PUT:', error);
    return NextResponse.json({ message: 'Failed to update product', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
export async function DELETE(request, context) {
  const id = (await Promise.resolve(context.params)).id;

  if (!id) {
    return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
  }

  const token = await getToken({ req: request });
  if (!token || (token.role !== 'admin' && token.role !== 'direktur')) {
    return NextResponse.json({ message: 'Forbidden: Only Admin or Direktur can delete products' }, { status: 403 });
  }

  let connection;
  try {
    connection = await createConnection();
    await connection.beginTransaction();

    if (token.role === 'admin') {
      // For admin, request deletion
      await connection.execute(`UPDATE products SET validation_status = 'pending_delete' WHERE id = ?`, [id]);
      await connection.commit();
      return NextResponse.json({ message: 'Permintaan hapus dikirim ke Direktur untuk persetujuan' }, { status: 200 });
    }

    // For direktur, perform direct deletion
    await connection.execute('DELETE FROM product_images WHERE product_id = ?', [id]);
    await connection.execute('DELETE FROM product_checklists WHERE product_id = ?', [id]);
    await connection.execute('DELETE FROM product_materials WHERE product_id = ?', [id]);
    await connection.execute('DELETE FROM product_assignees WHERE product_id = ?', [id]);
    const [result] = await connection.execute('DELETE FROM products WHERE id = ?', [id]);

    await connection.commit();

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' }, { status: 200 });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Database query failed during DELETE:', error);
    return NextResponse.json({ message: 'Failed to delete product', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}