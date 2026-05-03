import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export async function GET() {
  let connection;
  try {
    connection = await createConnection();
    const [rows] = await connection.execute('SELECT * FROM suppliers ORDER BY id DESC');
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json({ message: 'Failed to fetch suppliers', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function POST(req) {
  let connection;
  const { name, contact_info_text, supplier_description } = await req.json();

  try {
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    connection = await createConnection();
    await connection.execute(
      `INSERT INTO suppliers (name, contact_info_text, supplier_description) VALUES (?, ?, ?)`,
      [name, contact_info_text || '', supplier_description || '']
    );
    
    return NextResponse.json({ message: 'Supplier added successfully' }, { status: 201 });

  } catch (error) {
    console.error('Failed to process POST request:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ message: `Supplier '${name}' already exists.` }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to add supplier', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
