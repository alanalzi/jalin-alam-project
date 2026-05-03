import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';
import { getToken } from "next-auth/jwt";

export async function GET(req) {
  const token = await getToken({ req });
  if (!token || token.role !== 'direktur') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  let connection;
  try {
    connection = await createConnection();

    const [inquiries] = await connection.execute(
      `SELECT id, inquiry_code, customer_name, product_name, request_date, created_at FROM inquiries WHERE validation_status = 'pending' ORDER BY created_at DESC`
    );

    const [inquiriesHistory] = await connection.execute(
      `SELECT id, inquiry_code, customer_name, product_name, request_date, created_at, validation_status, validation_notes FROM inquiries WHERE validation_status IN ('approved', 'rejected') ORDER BY created_at DESC`
    );

    const [products] = await connection.execute(
      `SELECT 
        p.id, 
        p.inquiry_code, 
        p.name, 
        p.category, 
        p.type,
        p.created_at,
        GROUP_CONCAT(u.name SEPARATOR ', ') as assignee_names
      FROM products p
      LEFT JOIN product_assignees pa ON p.id = pa.product_id
      LEFT JOIN users u ON pa.user_id = u.id
      WHERE p.validation_status = 'pending'
      GROUP BY p.id
      ORDER BY p.created_at DESC`
    );

    const [productsHistory] = await connection.execute(
      `SELECT 
        p.id, 
        p.inquiry_code, 
        p.name, 
        p.category, 
        p.type,
        p.created_at,
        p.validation_status,
        p.validation_notes,
        GROUP_CONCAT(u.name SEPARATOR ', ') as assignee_names
      FROM products p
      LEFT JOIN product_assignees pa ON p.id = pa.product_id
      LEFT JOIN users u ON pa.user_id = u.id
      WHERE p.validation_status IN ('approved', 'rejected')
      GROUP BY p.id
      ORDER BY p.created_at DESC`
    );

    return NextResponse.json({ inquiries, products, inquiriesHistory, productsHistory });
  } catch (error) {
    console.error('Validation fetch error:', error);
    return NextResponse.json({ message: 'Error fetching validations', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function PUT(req) {
  const token = await getToken({ req });
  if (!token || token.role !== 'direktur') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  let connection;
  try {
    const { id, type, status, notes = null } = await req.json(); // notes is optional
    if (!id || !type || !status) {
      return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    connection = await createConnection();

    if (type === 'inquiry') {
      await connection.execute(`UPDATE inquiries SET validation_status = ?, validation_notes = ? WHERE id = ?`, [status, notes, id]);
      
      // If inquiry is rejected, also reject any associated products
      if (status === 'rejected') {
        const [inqRows] = await connection.execute(`SELECT inquiry_code FROM inquiries WHERE id = ?`, [id]);
        if (inqRows.length > 0) {
          await connection.execute(
            `UPDATE products SET validation_status = 'rejected', validation_notes = ? WHERE inquiry_code = ?`, 
            [`Inquiry ditolak: ${notes}`, inqRows[0].inquiry_code]
          );
        }
      }
    } else if (type === 'product') {
      await connection.execute(`UPDATE products SET validation_status = ?, validation_notes = ? WHERE id = ?`, [status, notes, id]);
    } else {
      return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Status updated' });
  } catch (error) {
    console.error('Validation update error:', error);
    return NextResponse.json({ message: 'Error updating validation', error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
