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
      `SELECT id, inquiry_code, customer_name, product_name, request_date, created_at, validation_status FROM inquiries WHERE validation_status IN ('pending', 'pending_delete') ORDER BY created_at DESC`
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
        p.validation_status,
        GROUP_CONCAT(u.name SEPARATOR ', ') as assignee_names
      FROM products p
      LEFT JOIN product_assignees pa ON p.id = pa.product_id
      LEFT JOIN users u ON pa.user_id = u.id
      WHERE p.validation_status IN ('pending', 'pending_delete')
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
      const [currentStatusRows] = await connection.execute('SELECT validation_status, inquiry_code FROM inquiries WHERE id = ?', [id]);
      if (currentStatusRows.length === 0) {
         return NextResponse.json({ message: 'Inquiry not found' }, { status: 404 });
      }
      const currentStatus = currentStatusRows[0].validation_status;
      const inquiryCode = currentStatusRows[0].inquiry_code;

      if (currentStatus === 'pending_delete') {
         if (status === 'approved') {
            // Perform actual deletion
            await connection.execute('DELETE FROM inquiry_images WHERE inquiry_id = ?', [id]);
            await connection.execute('DELETE FROM inquiry_assignees WHERE inquiry_id = ?', [id]);
            await connection.execute('DELETE FROM inquiries WHERE id = ?', [id]);
            
            // Delete associated product
            const [prodRows] = await connection.execute('SELECT id FROM products WHERE inquiry_code = ?', [inquiryCode]);
            for (const prod of prodRows) {
              const prodId = prod.id;
              await connection.execute('DELETE FROM product_images WHERE product_id = ?', [prodId]);
              await connection.execute('DELETE FROM product_checklists WHERE product_id = ?', [prodId]);
              await connection.execute('DELETE FROM product_materials WHERE product_id = ?', [prodId]);
              await connection.execute('DELETE FROM product_assignees WHERE product_id = ?', [prodId]);
              await connection.execute('DELETE FROM products WHERE id = ?', [prodId]);
            }
         } else if (status === 'rejected') {
            await connection.execute(`UPDATE inquiries SET validation_status = 'approved', validation_notes = ? WHERE id = ?`, [`Hapus Ditolak: ${notes || ''}`, id]);
            await connection.execute(`UPDATE products SET validation_status = 'approved', validation_notes = ? WHERE inquiry_code = ?`, [`Hapus Ditolak: ${notes || ''}`, inquiryCode]);
         }
      } else {
        await connection.execute(`UPDATE inquiries SET validation_status = ?, validation_notes = ? WHERE id = ?`, [status, notes, id]);
        
        // If inquiry is rejected, also reject any associated products
        if (status === 'rejected') {
          if (inquiryCode) {
            await connection.execute(
              `UPDATE products SET validation_status = 'rejected', validation_notes = ? WHERE inquiry_code = ?`, 
              [`Inquiry ditolak: ${notes || ''}`, inquiryCode]
            );
          }
        }
      }
    } else if (type === 'product') {
      const [currentStatusRows] = await connection.execute('SELECT validation_status FROM products WHERE id = ?', [id]);
      if (currentStatusRows.length === 0) {
         return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }
      const currentStatus = currentStatusRows[0].validation_status;

      if (currentStatus === 'pending_delete') {
         if (status === 'approved') {
            await connection.execute('DELETE FROM product_images WHERE product_id = ?', [id]);
            await connection.execute('DELETE FROM product_checklists WHERE product_id = ?', [id]);
            await connection.execute('DELETE FROM product_materials WHERE product_id = ?', [id]);
            await connection.execute('DELETE FROM product_assignees WHERE product_id = ?', [id]);
            await connection.execute('DELETE FROM products WHERE id = ?', [id]);
         } else if (status === 'rejected') {
            await connection.execute(`UPDATE products SET validation_status = 'approved', validation_notes = ? WHERE id = ?`, [`Hapus Ditolak: ${notes || ''}`, id]);
         }
      } else {
        await connection.execute(`UPDATE products SET validation_status = ?, validation_notes = ? WHERE id = ?`, [status, notes, id]);
      }
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
