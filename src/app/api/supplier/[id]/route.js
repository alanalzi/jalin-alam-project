// jalin-alam/src/app/api/supplier/[id]/route.js
import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export async function PUT(req, context) {
  const id = (await Promise.resolve(context.params)).id;
  const { name, contact_info_text, supplier_description } = await req.json();

  if (!id) {
    return NextResponse.json({ message: 'Supplier ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await createConnection();
    await connection.execute(
      'UPDATE suppliers SET name = ?, contact_info_text = ?, supplier_description = ? WHERE id = ?',
      [name, contact_info_text || '', supplier_description || '', id]
    );
    return NextResponse.json({ message: 'Supplier updated successfully' });
  } catch (error) {
    console.error('Database query failed during PUT:', error);
    return NextResponse.json({ message: 'Failed to update supplier', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function DELETE(req, context) {
  const id = (await Promise.resolve(context.params)).id;

  if (!id) {
    return NextResponse.json({ message: 'Supplier ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await createConnection();
    await connection.execute('DELETE FROM suppliers WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Database query failed during DELETE:', error);
    return NextResponse.json({ message: 'Failed to delete supplier', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
