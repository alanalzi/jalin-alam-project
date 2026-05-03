// jalin-alam/src/app/api/inquiries/route.js
import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';
import { getToken } from "next-auth/jwt";

export async function GET() {
  let connection;
  try {
    connection = await createConnection();
    const [rows] = await connection.execute(`
      SELECT
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
        i.validation_status,
        i.validation_notes,
        p.id AS product_id,
        p.status AS product_status,
        p.validation_status AS product_validation_status,
        GROUP_CONCAT(DISTINCT ii.image_url ORDER BY ii.id ASC) AS images,
        GROUP_CONCAT(DISTINCT CONCAT(ia.user_id, '|', u.name)) AS assigneesData
      FROM
        inquiries i
      LEFT JOIN
        products p ON i.inquiry_code = p.inquiry_code
      LEFT JOIN
        inquiry_images ii ON i.id = ii.inquiry_id
      LEFT JOIN
        inquiry_assignees ia ON i.id = ia.inquiry_id
      LEFT JOIN
        users u ON ia.user_id = u.id
      GROUP BY
        i.id, i.inquiry_code, i.customer_name, i.customer_email, i.customer_phone, i.customer_address, i.product_name, i.product_description, i.customer_request, i.request_date, i.image_deadline, i.order_quantity, i.created_at, i.updated_at, i.validation_status, i.validation_notes, p.id, p.status, p.validation_status
      ORDER BY i.created_at DESC
    `);
    
    const inquiries = rows.map(row => ({
      ...row,
      images: row.images ? row.images.split(',') : [],
      assignees: row.assigneesData ? row.assigneesData.split(',').map(s => {
        const [id, name] = s.split('|');
        return { id: parseInt(id), name };
      }) : [],
    }));

    return NextResponse.json(inquiries);
  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json({ message: 'Failed to fetch inquiries', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function POST(req) {
  const token = await getToken({ req });
  if (!token || (token.role !== 'direktur' && token.role !== 'admin')) {
    return NextResponse.json({ message: 'Forbidden: Only Direktur or Admin can add inquiries' }, { status: 403 });
  }

  let connection;
  let { 
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
    images
  } = await req.json();

  const finalImageDeadline = image_deadline ? image_deadline : null;

  try {
    if (!customer_name || !product_name || !request_date || !order_quantity) {
      return NextResponse.json({ message: 'Customer Name, Product Name, Request Date, and Order Quantity are required' }, { status: 400 });
    }

    connection = await createConnection();
    await connection.beginTransaction();

    if (!inquiry_code) {
      const [uuidRows] = await connection.execute('SELECT UUID() as uuid');
      inquiry_code = `INQ-${uuidRows[0].uuid.split('-')[0].toUpperCase()}-${Date.now()}`;
    } else {
      const [existing] = await connection.execute('SELECT id FROM inquiries WHERE inquiry_code = ?', [inquiry_code]);
      if (existing.length > 0) {
        await connection.rollback();
        return NextResponse.json({ message: `Inquiry code '${inquiry_code}' already exists.` }, { status: 409 });
      }
    }
    
    const valStatus = token.role === 'direktur' ? 'approved' : 'pending';
    const [result] = await connection.execute(
      `INSERT INTO inquiries (inquiry_code, customer_name, customer_email, customer_phone, customer_address, product_name, product_description, customer_request, request_date, image_deadline, order_quantity, validation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inquiry_code, customer_name, customer_email, customer_phone, customer_address, product_name, product_description, customer_request, request_date, finalImageDeadline, order_quantity, valStatus]
    );
    const inquiryId = result.insertId;

    if (images && Array.isArray(images) && images.length > 0) {
      const imageValues = images.map(imageUrl => [inquiryId, imageUrl]);
      await connection.query(
        'INSERT INTO inquiry_images (inquiry_id, image_url) VALUES ?',
        [imageValues]
      );
    }

    if (assignee_ids && Array.isArray(assignee_ids) && assignee_ids.length > 0) {
      const parsedIds = assignee_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      if (parsedIds.length > 0) {
        const assigneeValues = parsedIds.map(userId => [inquiryId, userId]);
        await connection.query(
          'INSERT INTO inquiry_assignees (inquiry_id, user_id) VALUES ?',
          [assigneeValues]
        );

        // Send notifications
        const notificationValues = parsedIds.map(userId => [userId, `You have been assigned to a new inquiry: ${inquiry_code}`, `/inquiries`]);
        await connection.query(
          'INSERT INTO notifications (user_id, message, link) VALUES ?',
          [notificationValues]
        );
      }
    }

    await connection.commit();

    return NextResponse.json({ message: 'Inquiry added successfully', inquiryId, inquiry_code }, { status: 201 });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Failed to process POST request:', error);
    if (error.code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ message: 'A unique field already has this value.', error: error.message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to add inquiry', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}