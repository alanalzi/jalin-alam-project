// jalin-alam/src/app/api/supplier/[id]/route.js
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jalin_alam_db',
};

export async function PUT(req, { params }) {
  const { id } = params;
  const { name, contact_info_text, supplier_description } = await req.json();

  if (!id) {
    return NextResponse.json({ message: 'Supplier ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      'UPDATE suppliers SET name = ?, contact_info_text = ?, supplier_description = ? WHERE id = ?',
      [name, contact_info_text || '', supplier_description || '', id]
    );
    return NextResponse.json({ message: 'Supplier updated successfully' });
  } catch (error) {
    console.error('Database query failed during PUT:', error);
    return NextResponse.json({ message: 'Failed to update supplier', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function DELETE(req, { params }) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ message: 'Supplier ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute('DELETE FROM suppliers WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Database query failed during DELETE:', error);
    return NextResponse.json({ message: 'Failed to delete supplier', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
