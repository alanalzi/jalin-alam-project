// jalin-alam/src/app/api/inquiries/[id]/route.js
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

  if (!id) {
    return NextResponse.json({ message: 'Inquiry ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await createConnection();

    const [rows] = await connection.execute(
      `SELECT
        i.id,
        i.inquiry_code,
        i.customer_name,
        i.customer_email,
        i.customer_phone,
        i.customer_address,
        i.product_name,
        i.product_description,
        i.customer_request,
        i.request_date,
        i.image_deadline,
        i.order_quantity,
        i.created_at,
        i.updated_at,
        GROUP_CONCAT(DISTINCT ii.image_url ORDER BY ii.id ASC) AS images,
        GROUP_CONCAT(DISTINCT CONCAT(ia.user_id, '|', u.name)) AS assigneesData
      FROM
        inquiries i
      LEFT JOIN
        inquiry_images ii ON i.id = ii.inquiry_id
      LEFT JOIN
        inquiry_assignees ia ON i.id = ia.inquiry_id
      LEFT JOIN
        users u ON ia.user_id = u.id
      WHERE i.id = ?
      GROUP BY
        i.id, i.inquiry_code, i.customer_name, i.customer_email, i.customer_phone, i.customer_address, i.product_name, i.product_description, i.customer_request, i.request_date, i.image_deadline, i.order_quantity, i.created_at, i.updated_at`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Inquiry not found' }, { status: 404 });
    }
    const inquiry = rows.map(row => ({
      ...row,
      request_date: formatLocalYYYYMMDD(row.request_date),
      image_deadline: formatLocalYYYYMMDD(row.image_deadline),
      images: row.images ? row.images.split(',') : [],
      assignees: row.assigneesData ? row.assigneesData.split(',').map(s => {
        const [id, name] = s.split('|');
        return { id: parseInt(id), name };
      }) : [],
    }))[0];


    return NextResponse.json(inquiry);

  } catch (error) {
    console.error('Database query failed during GET:', error);
    return NextResponse.json({ message: 'Failed to fetch inquiry', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function PUT(request, context) {
  const token = await getToken({ req: request });
  if (!token || (token.role !== 'direktur' && token.role !== 'admin')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  const id = (await Promise.resolve(context.params)).id;
  const {
    inquiry_code,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    product_name,
    product_description,
    customer_request,
    request_date,
    image_deadline,
    order_quantity,
    assignee_ids,
    images // Include images in destructuring
  } = await request.json();

  const finalImageDeadline = image_deadline ? image_deadline : null;

  if (!id) {
    return NextResponse.json({ message: 'Inquiry ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await createConnection();

    // BACKEND GUARD: Check if the inquiry is locked
    const [lockRows] = await connection.execute(
      `SELECT validation_status, inquiry_code FROM inquiries WHERE id = ?`,
      [id]
    );

    if (lockRows.length > 0) {
      const inq = lockRows[0];
      if (inq.validation_status === 'pending' || inq.validation_status === 'pending_delete') {
         return NextResponse.json({ message: 'Inquiry sedang dalam proses validasi. Perubahan tidak diizinkan.' }, { status: 403 });
      }

      // Check for pending edit requests for this inquiry
      const [pendingEdits] = await connection.execute(
        `SELECT id FROM edit_requests WHERE target_id = ? AND target_type = 'inquiry' AND status = 'pending'`,
        [id]
      );
      if (pendingEdits.length > 0) {
        return NextResponse.json({ message: 'Inquiry sedang dalam proses pengajuan edit. Tunggu validasi Direktur.' }, { status: 403 });
      }

      // Also check related product if it exists
      if (inq.inquiry_code) {
        const [pendingProdEdits] = await connection.execute(
          `SELECT er.id FROM edit_requests er 
           JOIN products p ON er.target_id = p.id 
           WHERE p.inquiry_code = ? AND er.target_type = 'product' AND er.status = 'pending'`,
          [inq.inquiry_code]
        );
        if (pendingProdEdits.length > 0) {
          return NextResponse.json({ message: 'Produk terkait sedang dalam proses pengajuan edit. Inquiry dikunci sementara.' }, { status: 403 });
        }
      }
    }

    if (!customer_name || !product_name || !request_date || !order_quantity || parseInt(order_quantity) < 1 || !assignee_ids || assignee_ids.length === 0) {
      return NextResponse.json({ message: 'Customer Name, Product Name, Request Date, Order Quantity (min 1), and at least one Assignee are required' }, { status: 400 });
    }

    await connection.beginTransaction(); // Start transaction

    // Get the old assignee_id to prevent duplicate notifications
    const [oldRows] = await connection.execute('SELECT user_id FROM inquiry_assignees WHERE inquiry_id = ?', [id]);
    const oldAssigneeIds = oldRows.map(row => row.user_id);

    const [result] = await connection.execute(
      `UPDATE inquiries SET
        inquiry_code = ?,
        customer_name = ?,
        customer_email = ?,
        customer_phone = ?,
        customer_address = ?,
        product_name = ?,
        product_description = ?,
        customer_request = ?,
        request_date = ?,
        image_deadline = ?,
        order_quantity = ?
      WHERE id = ?`,
      [inquiry_code, customer_name, customer_email, customer_phone, customer_address, product_name, product_description, customer_request, request_date, finalImageDeadline, order_quantity, id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback(); // Rollback if inquiry not found
      return NextResponse.json({ message: 'Inquiry not found' }, { status: 404 });
    }

    // Handle images: delete existing and insert new ones
    await connection.execute('DELETE FROM inquiry_images WHERE inquiry_id = ?', [id]);
    if (images && Array.isArray(images) && images.length > 0) {
      const imageValues = images.map(imageUrl => [id, imageUrl]);
      await connection.query(
        'INSERT INTO inquiry_images (inquiry_id, image_url) VALUES ?',
        [imageValues]
      );
    }
    // Update Assignees
    await connection.execute('DELETE FROM inquiry_assignees WHERE inquiry_id = ?', [id]);
    if (assignee_ids && Array.isArray(assignee_ids) && assignee_ids.length > 0) {
      const parsedIds = assignee_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      if (parsedIds.length > 0) {
        const assigneeValues = parsedIds.map(userId => [id, userId]);
        await connection.query(
          'INSERT INTO inquiry_assignees (inquiry_id, user_id) VALUES ?',
          [assigneeValues]
        );

        // Send notifications to NEW assignees only
        const newAssignees = parsedIds.filter(userId => !oldAssigneeIds.includes(userId));
        if (newAssignees.length > 0) {
          const notificationValues = newAssignees.map(userId => [userId, `You have been assigned to specific inquiry: ${inquiry_code}`, `/inquiries`]);
          await connection.query(
            'INSERT INTO notifications (user_id, message, link) VALUES ?',
            [notificationValues]
          );
        }
      }
    }

    await connection.commit(); // Commit transaction

    return NextResponse.json({ message: 'Inquiry updated successfully' });

  } catch (error) {
    console.error('Database query failed during PUT:', error);
    return NextResponse.json({ message: 'Failed to update inquiry', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function DELETE(request, context) {
  const token = await getToken({ req: request });
  if (!token || (token.role !== 'direktur' && token.role !== 'admin')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  const id = (await Promise.resolve(context.params)).id;

  if (!id) {
    return NextResponse.json({ message: 'Inquiry ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await createConnection();
    await connection.beginTransaction(); // Start transaction

    if (token.role === 'admin') {
      // For admin, request deletion
      await connection.execute(`UPDATE inquiries SET validation_status = 'pending_delete' WHERE id = ?`, [id]);
      
      const [inq] = await connection.execute('SELECT inquiry_code FROM inquiries WHERE id = ?', [id]);
      if (inq.length > 0) {
          await connection.execute(`UPDATE products SET validation_status = 'pending_delete' WHERE inquiry_code = ?`, [inq[0].inquiry_code]);
      }
      await connection.commit();
      return NextResponse.json({ message: 'Permintaan hapus dikirim ke Direktur untuk persetujuan' });
    }

    // For direktur, perform direct deletion
    // Get inquiry code before deletion to find the product
    const [inqRows] = await connection.execute('SELECT inquiry_code FROM inquiries WHERE id = ?', [id]);
    
    // Delete associated images first
    await connection.execute('DELETE FROM inquiry_images WHERE inquiry_id = ?', [id]);
    await connection.execute('DELETE FROM inquiry_assignees WHERE inquiry_id = ?', [id]);

    const [result] = await connection.execute(
      'DELETE FROM inquiries WHERE id = ?',
      [id]
    );

    // Also delete product if it exists
    if (inqRows.length > 0) {
      const inquiryCode = inqRows[0].inquiry_code;
      const [prodRows] = await connection.execute('SELECT id FROM products WHERE inquiry_code = ?', [inquiryCode]);
      for (const prod of prodRows) {
        const prodId = prod.id;
        await connection.execute('DELETE FROM product_images WHERE product_id = ?', [prodId]);
        await connection.execute('DELETE FROM product_checklists WHERE product_id = ?', [prodId]);
        await connection.execute('DELETE FROM product_materials WHERE product_id = ?', [prodId]);
        await connection.execute('DELETE FROM product_assignees WHERE product_id = ?', [prodId]);
        await connection.execute('DELETE FROM products WHERE id = ?', [prodId]);
      }
    }

    await connection.commit(); // Commit transaction

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Inquiry not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Inquiry and related data deleted successfully' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Database query failed during DELETE:', error);
    return NextResponse.json({ message: 'Failed to delete inquiry', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
