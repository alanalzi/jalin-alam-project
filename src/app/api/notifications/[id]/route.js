import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import createConnection from '@/app/lib/db';

export async function PUT(request, context) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const id = (await Promise.resolve(context.params)).id;

    let connection;
    try {
        connection = await createConnection();
        // Mark the notification as read, ensuring it belongs to the logged in user
        const [result] = await connection.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [id, session.user.id]
        );

        if (result.affectedRows === 0) {
             return NextResponse.json({ message: 'Notification not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Database query failed:', error);
        return NextResponse.json({ message: 'Failed to update notification', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
