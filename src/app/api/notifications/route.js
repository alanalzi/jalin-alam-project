import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import createConnection from '@/app/lib/db';

export async function GET(request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    let connection;
    try {
        connection = await createConnection();
        let query = 'SELECT id, message, is_read, created_at, link FROM notifications WHERE user_id = ?';
        const params = [session.user.id];

        if (filter === 'unread') {
            query += ' AND is_read = FALSE';
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await connection.execute(query, params);
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Database query failed:', error);
        return NextResponse.json({ message: 'Failed to fetch notifications', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
