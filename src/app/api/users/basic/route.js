import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import createConnection from '@/app/lib/db';

export async function GET() {
    const session = await getServerSession(authOptions);

    // Ensure only authenticated users can access the route
    if (!session?.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let connection;
    try {
        connection = await createConnection();
        // Return only basic info to populate a select options list
        const [rows] = await connection.execute('SELECT id, name FROM users ORDER BY name ASC');
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Database query failed:', error);
        return NextResponse.json({ message: 'Failed to fetch users', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
