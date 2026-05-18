// jalin-alam/src/app/api/products/route.js
import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';
import { getToken } from "next-auth/jwt";

export async function GET(request) {
  const inquiryCode = request.nextUrl.searchParams.get('inquiryCode');
  let connection;
  try {
    connection = await createConnection();

    let query = `
      SELECT
        p.id,
        CASE WHEN p.type = 'Custom' THEN COALESCE(i.product_name, p.name) ELSE p.name END as name,
        p.inquiry_code,
        p.category,
        CASE WHEN p.type = 'Custom' THEN COALESCE(i.product_description, p.description) ELSE p.description END as description,
        p.start_date AS startDate,
        p.deadline,
        CASE WHEN p.type = 'Custom' THEN COALESCE(i.order_quantity, p.order_quantity) ELSE p.order_quantity END as order_quantity,
        p.created_at,
        CASE 
          WHEN p.status = 'cancelled' THEN 'cancelled'
          WHEN p.status IN ('Done', 'Selesai', 'completed') AND p.completed_at > p.deadline THEN 'Late Done'
          WHEN (p.status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR p.status IS NULL) AND p.deadline < CURDATE() THEN 'Late'
          ELSE COALESCE(p.status, 'Ongoing')
        END AS status,
        p.validation_status,
        i.validation_status AS inquiry_validation_status,
        p.validation_notes,
        i.validation_notes AS inquiry_validation_notes,
        p.type,
        p.custom_attributes,
        GROUP_CONCAT(pi.image_url ORDER BY pi.id ASC) AS images,
        COALESCE(ROUND(AVG(pc.percentage)), 0) AS overallChecklistPercentage,
        EXISTS(SELECT 1 FROM edit_requests er WHERE er.target_id = p.id AND er.target_type = 'product' AND er.status = 'pending') as has_pending_edit,
        EXISTS(SELECT 1 FROM edit_requests er WHERE er.target_id = i.id AND er.target_type = 'inquiry' AND er.status = 'pending') as inquiry_has_pending_edit
      FROM
        products p
      LEFT JOIN
        inquiries i ON p.inquiry_code = i.inquiry_code
      LEFT JOIN
        product_images pi ON p.id = pi.product_id
      LEFT JOIN
        product_checklists pc ON p.id = pc.product_id`;

    const queryParams = [];

    if (inquiryCode) {
      query += ` WHERE p.inquiry_code = ?`;
      queryParams.push(inquiryCode);
    }

    query += `
      GROUP BY
        p.id, p.name, p.inquiry_code, p.category, p.description, p.start_date, p.deadline, p.created_at, p.status, p.validation_status, p.validation_notes, p.type, i.id, i.product_name, i.product_description
      ORDER BY p.id DESC
    `;

    const [rows] = await connection.execute(query, queryParams);

    // Process rows to group images into an array for each product
    const products = rows.map(row => {
      let customAttributes = row.custom_attributes;
      if (typeof customAttributes === 'string') {
        try {
          customAttributes = JSON.parse(customAttributes);
        } catch (e) {
          customAttributes = [];
        }
      }

      return {
        ...row,
        images: row.images ? row.images.split(',') : [],
        custom_attributes: Array.isArray(customAttributes) ? customAttributes : [],
        has_pending_edit: !!row.has_pending_edit,
        inquiry_has_pending_edit: !!row.inquiry_has_pending_edit,
      };
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json({ message: 'Failed to fetch products', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function POST(req) {
  let connection;
  try {
    const token = await getToken({ req });
    if (!token || (token.role !== 'direktur' && token.role !== 'admin')) {
      return NextResponse.json({ message: 'Forbidden: Only Direktur or Admin can add products' }, { status: 403 });
    }

    const { 
      name, inquiry_code, category, description, startDate, deadline, 
      status, requiredMaterials, images, type, custom_attributes, checklist,
      assignee_ids, order_quantity
    } = await req.json();

    if (!name || !inquiry_code || !order_quantity || parseInt(order_quantity) < 1) {
      return NextResponse.json({ message: 'Name, Inquiry Code, and a valid Order Quantity (min 1) are required' }, { status: 400 });
    }

    // Date Validation
    if (startDate && deadline && new Date(deadline) < new Date(startDate)) {
      return NextResponse.json({ message: 'Tanggal Deadline tidak boleh sebelum Tanggal Mulai.' }, { status: 400 });
    }

    connection = await createConnection();

    // Prevent Duplicates (check if same inquiry_code recently added to products)
    const [existingProd] = await connection.execute(
      "SELECT id FROM products WHERE inquiry_code = ?",
      [inquiry_code]
    );
    if (existingProd.length > 0) {
      return NextResponse.json({ message: 'Produk dengan kode inquiry ini sudah terdaftar. Gunakan menu edit untuk merubahnya.' }, { status: 409 });
    }

    if (type === 'Custom') {
      const [inquiryRows] = await connection.execute('SELECT validation_status FROM inquiries WHERE inquiry_code = ?', [inquiry_code]);
      if (inquiryRows.length > 0 && inquiryRows[0].validation_status !== 'approved') {
        connection.release();
        return NextResponse.json({ message: 'Cannot create Custom Product. Inquiry is not approved yet.' }, { status: 403 });
      }
    }

    await connection.beginTransaction();

    let valStatus = token.role === 'direktur' ? 'approved' : 'pending';

    // 1. Insert new product
    const [productResult] = await connection.execute(
      `INSERT INTO products (name, inquiry_code, category, description, start_date, deadline, status, type, custom_attributes, validation_status, order_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, inquiry_code, category, description, startDate || null, deadline || null, status || 'ongoing', type || 'Standard', JSON.stringify(custom_attributes || []), valStatus, parseInt(order_quantity) || 0]
    );
    const productId = productResult.insertId;

    // 2. Handle required materials
    if (requiredMaterials && requiredMaterials.length > 0) {
      for (const supplier of requiredMaterials) {
        const materialId = supplier.supplier_id;
        await connection.execute(
          'INSERT INTO product_materials (product_id, material_id, quantity_needed) VALUES (?, ?, ?)',
          [productId, materialId, 1]
        );
      }
    }

    // 3. Handle product images
    if (images && Array.isArray(images) && images.length > 0) {
      const imageValues = images.map(imageUrl => [productId, imageUrl]);
      await connection.query(
        'INSERT INTO product_images (product_id, image_url) VALUES ?',
        [imageValues]
      );
    }

    // 4. Handle initial checklist (from template or manual)
    if (checklist && Array.isArray(checklist) && checklist.length > 0) {
      for (const task of checklist) {
        await connection.execute(
          'INSERT INTO product_checklists (product_id, task, percentage) VALUES (?, ?, ?)',
          [productId, task.task_name || task.task, 0]
        );
      }
    }

    // 5. Handle assignees
    if (assignee_ids && Array.isArray(assignee_ids) && assignee_ids.length > 0) {
      const assigneeValues = assignee_ids.map(userId => [productId, userId]);
      await connection.query(
        'INSERT INTO product_assignees (product_id, user_id) VALUES ?',
        [assigneeValues]
      );
    }

    await connection.commit();
    return NextResponse.json({ message: 'Product added successfully', productId }, { status: 201 });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Failed to process POST request:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ message: `Inquiry Code already exists.` }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to add product', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}


