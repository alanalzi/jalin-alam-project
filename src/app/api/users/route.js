import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import createConnection from '@/app/lib/db';

export async function GET() {
    const session = await getServerSession(authOptions);

    // Only Direktur or Admin can view users list
    if (!['direktur', 'admin'].includes(session?.user?.role)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    let connection;
    try {
        connection = await createConnection();
        const [rows] = await connection.execute('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Database query failed:', error);
        return NextResponse.json({ message: 'Failed to fetch users', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
