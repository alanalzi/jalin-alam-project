// jalin-alam/src/app/api/inquiries/[id]/route.js
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jalin_alam_db',
};

export async function GET(request, context) {
  const { id } = context.params;

  if (!id) {
    return NextResponse.json({ message: 'Inquiry ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      `SELECT
        i.id,
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
      WHERE i.id = ?
      GROUP BY
        i.id, i.customer_name, i.customer_email, i.customer_phone, i.customer_address, i.product_name, i.product_description, i.customer_request, i.request_date, i.image_deadline, i.order_quantity, i.created_at, i.updated_at`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Inquiry not found' }, { status: 404 });
    }
    const inquiry = rows.map(row => ({
      ...row,
      images: row.images ? row.images.split(',') : [],
    }))[0];


    return NextResponse.json(inquiry);

  } catch (error) {
    console.error('Database query failed during GET:', error);
    return NextResponse.json({ message: 'Failed to fetch inquiry', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function PUT(request, context) {
  const { id } = context.params;
  const {
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
    images // Include images in destructuring
  } = await request.json();

  if (!id) {
    return NextResponse.json({ message: 'Inquiry ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction(); // Start transaction

    const [result] = await connection.execute(
      `UPDATE inquiries SET
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
      [customer_name, customer_email, customer_phone, customer_address, product_name, product_description, customer_request, request_date, image_deadline, order_quantity, id]
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
    await connection.commit(); // Commit transaction

    return NextResponse.json({ message: 'Inquiry updated successfully' });

  } catch (error) {
    console.error('Database query failed during PUT:', error);
    return NextResponse.json({ message: 'Failed to update inquiry', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function DELETE(request, context) {
  const { id } = context.params;

  if (!id) {
    return NextResponse.json({ message: 'Inquiry ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction(); // Start transaction

    // Delete associated images first
    await connection.execute('DELETE FROM inquiry_images WHERE inquiry_id = ?', [id]);

    const [result] = await connection.execute(
      'DELETE FROM inquiries WHERE id = ?',
      [id]
    );

    await connection.commit(); // Commit transaction

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Inquiry not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Inquiry deleted successfully' });

  } catch (error) {
    console.error('Database query failed during DELETE:', error);
    return NextResponse.json({ message: 'Failed to delete inquiry', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
