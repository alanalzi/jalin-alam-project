// jalin-alam/src/app/api/products/[id]/progress/route.js
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createConnection from '@/app/lib/db';

console.log('>>> LOADING: src/app/api/products/[id]/progress/route.js');

export async function GET(request, context) {
  console.log('GET /api/products/[id]/progress - Request received');
  const id = (await Promise.resolve(context.params)).id;
  console.log('GET /api/products/[id]/progress - ID:', id);

  if (!id) {
    return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await createConnection();

    // Fetch progress logs for this product, ordered by newest first, joining with users table
    const [rows] = await connection.execute(
      `SELECT log.id, log.comment, log.image_url, log.created_at, u.name as userName, u.role as userRole 
       FROM product_progress_logs log
       LEFT JOIN users u ON log.user_id = u.id
       WHERE log.product_id = ? 
       ORDER BY log.created_at DESC`,
      [id]
    );

    console.log('GET /api/products/[id]/progress - Found rows:', rows.length);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Database query failed during GET progress:', error);
    return NextResponse.json({ message: 'Failed to fetch progress logs', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function POST(request, context) {
  console.log('POST /api/products/[id]/progress - Request received');
  const id = (await Promise.resolve(context.params)).id;
  console.log('POST /api/products/[id]/progress started for ID:', id);
  
  const token = await getToken({ req: request });
  console.log('Token retrieved:', token ? 'User logged in' : 'No token');

  const { comment, image_url } = await request.json();
  console.log('Request body parsed:', { comment, image_url });

  if (!id) {
    return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
  }

  if (!comment) {
    return NextResponse.json({ message: 'Comment is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await createConnection();

    const userId = token?.id || null;

    const [result] = await connection.execute(
      'INSERT INTO product_progress_logs (product_id, comment, image_url, user_id) VALUES (?, ?, ?, ?)',
      [id, comment, image_url || null, userId]
    );

    console.log('POST /api/products/[id]/progress - Insert ID:', result.insertId);
    return NextResponse.json({ 
      message: 'Progress update added successfully', 
      id: result.insertId 
    }, { status: 201 });

  } catch (error) {
    console.error('Database query failed during POST progress:', error);
    return NextResponse.json({ message: 'Failed to add progress update', error: error.message }, { status: 500 });
  } finally {
    console.log('POST /api/products/[id]/progress finished');
    if (connection) connection.release();
  }
}
