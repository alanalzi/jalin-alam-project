// jalin-alam/src/app/api/inquiries/route.js
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jalin_alam_db',
};

export async function GET() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
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
        GROUP_CONCAT(ii.image_url ORDER BY ii.id ASC) AS images
      FROM
        inquiries i
      LEFT JOIN
        inquiry_images ii ON i.id = ii.inquiry_id
      GROUP BY
        i.id, i.inquiry_code, i.customer_name, i.customer_email, i.customer_phone, i.customer_address, i.product_name, i.product_description, i.customer_request, i.request_date, i.image_deadline, i.order_quantity, i.created_at, i.updated_at
      ORDER BY i.created_at DESC
    `);
    
    const inquiries = rows.map(row => ({
      ...row,
      images: row.images ? row.images.split(',') : [],
    }));

    return NextResponse.json(inquiries);
  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json({ message: 'Failed to fetch inquiries', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function POST(req) {
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
    images
  } = await req.json();

  try {
    if (!customer_name || !product_name || !request_date || !order_quantity) {
      return NextResponse.json({ message: 'Customer Name, Product Name, Request Date, and Order Quantity are required' }, { status: 400 });
    }

    connection = await mysql.createConnection(dbConfig);
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
    
    const [result] = await connection.execute(
      `INSERT INTO inquiries (inquiry_code, customer_name, customer_email, customer_phone, customer_address, product_name, product_description, customer_request, request_date, image_deadline, order_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inquiry_code, customer_name, customer_email, customer_phone, customer_address, product_name, product_description, customer_request, request_date, image_deadline, order_quantity]
    );
    const inquiryId = result.insertId;

    if (images && Array.isArray(images) && images.length > 0) {
      const imageValues = images.map(imageUrl => [inquiryId, imageUrl]);
      await connection.query(
        'INSERT INTO inquiry_images (inquiry_id, image_url) VALUES ?',
        [imageValues]
      );
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
      await connection.end();
    }
  }
}