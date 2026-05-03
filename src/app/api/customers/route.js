import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export async function GET() {
  let connection;
  try {
    connection = await createConnection();
    const [rows] = await connection.execute('SELECT id, name, email, phone, address FROM customers');
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Database query failed during GET /api/customers:', error);
    return NextResponse.json({ message: 'Failed to fetch customers', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
