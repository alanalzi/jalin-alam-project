// jalin-alam/src/app/api/inquiries/route.js
import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';
import { getToken } from "next-auth/jwt";

export async function GET() {
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
        CASE 
          WHEN p.status IN ('Done', 'Selesai', 'completed') AND p.completed_at > p.deadline THEN 'Late Done'
          ELSE p.status 
        END AS product_status,
        p.validation_status AS product_validation_status,
        GROUP_CONCAT(DISTINCT ii.image_url ORDER BY ii.id ASC) AS images,
        GROUP_CONCAT(DISTINCT CONCAT(ia.user_id, '|', u.name)) AS assigneesData,
        EXISTS(SELECT 1 FROM edit_requests er WHERE er.target_id = p.id AND er.target_type = 'product' AND er.status = 'pending') as product_has_pending_edit,
        EXISTS(SELECT 1 FROM edit_requests er WHERE er.target_id = i.id AND er.target_type = 'inquiry' AND er.status = 'pending') as has_pending_edit
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
      request_date: formatLocalYYYYMMDD(row.request_date),
      image_deadline: formatLocalYYYYMMDD(row.image_deadline),
      images: row.images ? row.images.split(',') : [],
      assignees: row.assigneesData ? row.assigneesData.split(',').map(s => {
        const [id, name] = s.split('|');
        return { id: parseInt(id), name };
      }) : [],
      product_has_pending_edit: !!row.product_has_pending_edit,
      has_pending_edit: !!row.has_pending_edit
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
    if (!customer_name || !product_name || !request_date || !order_quantity || parseInt(order_quantity) < 1 || !assignee_ids || assignee_ids.length === 0) {
      return NextResponse.json({ message: 'Customer Name, Product Name, Request Date, Order Quantity (min 1), and at least one Assignee are required' }, { status: 400 });
    }

    // Date Validation
    if (image_deadline && new Date(image_deadline) < new Date(request_date)) {
      return NextResponse.json({ message: 'Target Deadline tidak boleh sebelum Tanggal Request.' }, { status: 400 });
    }

    connection = await createConnection();

    // Prevent Duplicates (check if same customer + product created in last 1 hour)
    const [recent] = await connection.execute(
      "SELECT id FROM inquiries WHERE customer_name = ? AND product_name = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)",
      [customer_name, product_name]
    );
    if (recent.length > 0) {
      return NextResponse.json({ message: 'Inquiry serupa baru saja dibuat. Harap cek kembali untuk menghindari data ganda.' }, { status: 409 });
    }

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