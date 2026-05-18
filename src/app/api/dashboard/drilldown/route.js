import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';
import { getToken } from "next-auth/jwt";

export async function GET(req) {
    let connection;
    try {
        const token = await getToken({ req });
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status'); // 'completed', 'ongoing', 'late', 'pending', 'cancelled'

        if (!status) {
            return NextResponse.json({ message: 'Status is required' }, { status: 400 });
        }

        connection = await createConnection();

        let query = "";
        let params = [];

        if (status === 'completed') {
            query = `
                SELECT id, name, category, status, inquiry_code, completed_at, 
                       (SELECT COUNT(*) FROM product_checklists WHERE product_id = p.id) as total_tasks,
                       (SELECT COUNT(*) FROM product_checklists WHERE product_id = p.id AND percentage = 100) as completed_tasks
                FROM products p 
                WHERE status IN ('Done', 'Selesai', 'completed')
                AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                ORDER BY completed_at DESC
            `;
        } else if (status === 'ongoing') {
            query = `
                SELECT id, name, category, status, inquiry_code, deadline, 
                       (SELECT COUNT(*) FROM product_checklists WHERE product_id = p.id) as total_tasks,
                       (SELECT COUNT(*) FROM product_checklists WHERE product_id = p.id AND percentage = 100) as completed_tasks
                FROM products p 
                WHERE validation_status = 'approved' 
                AND (status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR status IS NULL)
                AND (deadline >= CURDATE() OR deadline IS NULL)
                ORDER BY deadline ASC
            `;
        } else if (status === 'late') {
            query = `
                SELECT id, name, category, status, inquiry_code, deadline, 
                       (SELECT COUNT(*) FROM product_checklists WHERE product_id = p.id) as total_tasks,
                       (SELECT COUNT(*) FROM product_checklists WHERE product_id = p.id AND percentage = 100) as completed_tasks
                FROM products p 
                WHERE (status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR status IS NULL)
                AND deadline < CURDATE()
                ORDER BY deadline ASC
            `;
        } else if (status === 'pending') {
            // Mix of pending products and pending inquiries
            const [productRows] = await connection.execute(`
                SELECT id, name, category, 'Product' as source, created_at, 'pending' as status
                FROM products 
                WHERE validation_status = 'pending'
            `);
            const [inquiryRows] = await connection.execute(`
                SELECT id, product_name as name, 'Inquiry' as category, 'Inquiry' as source, created_at, 'pending' as status
                FROM inquiries 
                WHERE validation_status = 'pending'
            `);
            const combined = [...productRows, ...inquiryRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return NextResponse.json(combined);
        } else if (status === 'active') {
            query = `
                SELECT id, name, category, status, inquiry_code, deadline, 
                       (SELECT COUNT(*) FROM product_checklists WHERE product_id = p.id) as total_tasks,
                       (SELECT COUNT(*) FROM product_checklists WHERE product_id = p.id AND percentage = 100) as completed_tasks
                FROM products p 
                WHERE (status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR status IS NULL)
                AND (validation_status = 'approved' OR validation_status IS NULL)
                ORDER BY deadline ASC
            `;
        } else if (status === 'near_deadline') {
            query = `
                SELECT id, name, category, status, inquiry_code, deadline, 
                       (SELECT COUNT(*) FROM product_checklists WHERE product_id = p.id) as total_tasks,
                       (SELECT COUNT(*) FROM product_checklists WHERE product_id = p.id AND percentage = 100) as completed_tasks
                FROM products p 
                WHERE (status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR status IS NULL)
                AND deadline BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                ORDER BY deadline ASC
            `;
        } else if (status === 'cancelled') {
            query = `
                SELECT id, name, category, status, inquiry_code, created_at
                FROM products p 
                WHERE status = 'cancelled'
                ORDER BY created_at DESC
            `;
        } else if (status === 'inquiry') {
            query = `
                SELECT i.id, i.product_name as name, 'Inquiry' as category, 'approved' as status, i.inquiry_code, i.created_at, 'Inquiry' as source
                FROM inquiries i
                LEFT JOIN products p ON i.inquiry_code = p.inquiry_code
                WHERE i.validation_status = 'approved' AND p.id IS NULL
                ORDER BY i.created_at DESC
            `;
        } else {
            return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
        }

        const [rows] = await connection.execute(query, params);
        return NextResponse.json(rows);

    } catch (error) {
        console.error('Drilldown API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
