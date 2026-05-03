import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import createConnection from '@/app/lib/db';

export async function PUT(request, context) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role !== 'direktur') {
    return NextResponse.json({ success: false, message: 'Unauthorized. Only Direktur can change roles.' }, { status: 403 });
  }

  const id = (await Promise.resolve(context.params)).id;

  if (!id) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  let connection;
  try {
    const body = await request.json();
    const { role: newRole } = body;

    connection = await createConnection();

    // Check if user exists
    const [userRows] = await connection.execute('SELECT id, name, email, role FROM users WHERE id = ?', [id]);

    if (userRows.length === 0) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Update user role
    await connection.execute('UPDATE users SET role = ? WHERE id = ?', [newRole, id]);

    // Fetch updated user
    const [updatedUserRows] = await connection.execute('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
    const updatedUser = updatedUserRows[0];

    return NextResponse.json({ success: true, data: updatedUser });

  } catch (error) {
    console.error('Database query failed during PUT user:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  } finally {
    if (connection) connection.release();
  }

}


export async function DELETE(request, context) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role !== 'direktur') {
    return NextResponse.json({ success: false, message: 'Unauthorized. Only Direktur can delete users.' }, { status: 403 });
  }

  const id = (await Promise.resolve(context.params)).id;

  if (!id) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await createConnection();
    const [result] = await connection.execute('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Database query failed during DELETE user:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

