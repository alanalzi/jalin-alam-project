// jalin-alam/src/app/api/products/[id]/route.js
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jalin_alam_db',
};

export async function DELETE(request, { params }) {
  const { id } = params;
  
  if (!id) {
    return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    // First, delete associated images from the product_images table
    await connection.execute('DELETE FROM product_images WHERE product_id = ?', [id]);

    // Second, delete the product from the products table
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
    if (connection) {
      await connection.end();
    }
  }
}