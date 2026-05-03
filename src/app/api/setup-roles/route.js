import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export async function GET(request) {
    const email = request.nextUrl.searchParams.get('email');

    let connection;
    try {
        connection = await createConnection();

        // 1. Update all existing 'user' roles to 'RnD'
        const [updateResult] = await connection.execute(
            "UPDATE users SET role = 'RnD' WHERE role = 'user'"
        );
        console.log(`Migrated ${updateResult.affectedRows} users to RnD role.`);

        let message = `Migrated ${updateResult.affectedRows} users to 'RnD'. `;

        // 2. Promote specific email to Direktur if provided
        if (email) {
            const [promoteResult] = await connection.execute(
                "UPDATE users SET role = 'direktur' WHERE email = ?",
                [email]
            );
            if (promoteResult.affectedRows > 0) {
                message += `Successfully promoted ${email} to 'direktur'.`;
            } else {
                message += `User ${email} not found, could not promote.`;
            }
        } else {
            message += "No email provided for promotion (add ?email=your@email.com to promote).";
        }

        return NextResponse.json({ message });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
