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

        connection = await createConnection();

        // 1. Total All Products (for Capacity and Rate calculation)
        const [allRows] = await connection.execute('SELECT COUNT(*) as count FROM products');
        const totalCapacity = allRows[0].count;

        // 2. Active Products (Ongoing/Late)
        const [activeRows] = await connection.execute(`
            SELECT COUNT(*) as count FROM products 
            WHERE status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR status IS NULL
        `);
        const totalActive = activeRows[0].count;

        // 3. Late Products
        const [lateRows] = await connection.execute(`
            SELECT COUNT(*) as count FROM products 
            WHERE (status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR status IS NULL)
            AND deadline < CURDATE()
        `);
        const lateProducts = lateRows[0].count;

        // 3. Near Deadline (Next 7 days)
        const [nearRows] = await connection.execute(`
            SELECT COUNT(*) as count FROM products 
            WHERE (status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR status IS NULL)
            AND deadline BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        `);
        const nearDeadlineCount = nearRows[0].count;

        // 4. Overall Progress (Average of all active checklists)
        const [progressRows] = await connection.execute(`
            SELECT COALESCE(AVG(percentage), 0) as avgProgress 
            FROM product_checklists pc
            JOIN products p ON pc.product_id = p.id
            WHERE p.status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR p.status IS NULL
        `);
        const totalProgress = progressRows[0].avgProgress;

        // 5. Status Distribution for Pie Chart
        const [statusCounts] = await connection.execute(`
            SELECT 
                SUM(CASE WHEN (status IN ('Done', 'Selesai', 'completed') AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN (status = 'cancelled') THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN (validation_status = 'pending') THEN 1 ELSE 0 END) as pending_products,
                SUM(CASE WHEN (validation_status = 'approved' AND (status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR status IS NULL) AND (deadline >= CURDATE() OR deadline IS NULL)) THEN 1 ELSE 0 END) as ongoing,
                SUM(CASE WHEN (validation_status = 'approved' AND (status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR status IS NULL) AND deadline < CURDATE()) THEN 1 ELSE 0 END) as late
            FROM products
        `);

        const [pendingInquiries] = await connection.execute(`
            SELECT COUNT(*) as count FROM inquiries WHERE validation_status = 'pending'
        `);

        const [inquiryNoProduct] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM inquiries i
            LEFT JOIN products p ON i.inquiry_code = p.inquiry_code
            WHERE i.validation_status = 'approved' AND p.id IS NULL
        `);

        const statusDist = {
            completed: parseInt(statusCounts[0].completed || 0),
            cancelled: parseInt(statusCounts[0].cancelled || 0),
            pending: parseInt(statusCounts[0].pending_products || 0) + parseInt(pendingInquiries[0].count || 0),
            ongoing: parseInt(statusCounts[0].ongoing || 0),
            late: parseInt(statusCounts[0].late || 0),
            inquiry: parseInt(inquiryNoProduct[0].count || 0)
        };

        // All Active Products (Limit 10)
        const [upcomingRows] = await connection.execute(`
            SELECT 
                p.id, p.name, p.deadline, p.category, p.inquiry_code, p.created_at,
                CASE 
                    WHEN (SELECT COALESCE(ROUND(AVG(pc2.percentage)), 0) FROM product_checklists pc2 WHERE pc2.product_id = p.id) = 100 AND p.deadline < CURDATE() THEN 'Late Done'
                    WHEN (p.status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR p.status IS NULL) AND p.deadline < CURDATE() THEN 'Late'
                    ELSE p.status
                END as status,
                COUNT(DISTINCT pc.id) as total_tasks,
                SUM(CASE WHEN pc.percentage = 100 THEN 1 ELSE 0 END) as completed_tasks,
                COALESCE(ROUND(AVG(pc.percentage)), 0) AS overallChecklistPercentage,
                (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM product_assignees pa JOIN users u ON pa.user_id = u.id WHERE pa.product_id = p.id) as assignee_names
            FROM products p
            LEFT JOIN product_checklists pc ON p.id = pc.product_id
            WHERE (p.status NOT IN ('Done', 'Selesai', 'completed', 'cancelled') OR p.status IS NULL)
            GROUP BY p.id
            ORDER BY 
                CASE WHEN p.deadline IS NULL THEN 1 ELSE 0 END,
                p.deadline ASC 
            LIMIT 10
        `);

        // Recently Completed Products (Limit 10)
        const [completedRows] = await connection.execute(`
            SELECT 
                p.id, p.name, p.deadline, p.category, p.inquiry_code, p.completed_at, p.created_at,
                CASE 
                    WHEN p.completed_at > p.deadline THEN 'Late Done'
                    ELSE 'Completed'
                END as status,
                COUNT(DISTINCT pc.id) as total_tasks,
                SUM(CASE WHEN pc.percentage = 100 THEN 1 ELSE 0 END) as completed_tasks,
                COALESCE(ROUND(AVG(pc.percentage)), 0) AS overallChecklistPercentage,
                (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM product_assignees pa JOIN users u ON pa.user_id = u.id WHERE pa.product_id = p.id) as assignee_names
            FROM products p
            LEFT JOIN product_checklists pc ON p.id = pc.product_id
            WHERE p.status IN ('Done', 'Selesai', 'completed')
            AND p.completed_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
            GROUP BY p.id
            ORDER BY 
                p.completed_at DESC, p.id DESC
            LIMIT 10
        `);

        // Final Data Assembly
        const processRows = (rows) => rows.map(row => {
            const names = row.assignee_names;
            return { 
                ...row, 
                assignees: names ? names.split(', ').map(n => ({ name: n })) : [] 
            };
        });

        return NextResponse.json({
            totalCapacity: totalCapacity,
            totalActive: totalActive,
            lateProducts: lateProducts,
            nearDeadlineCount: nearDeadlineCount,
            ongoingProducts: totalActive,
            completionRate: Math.round(totalProgress),
            upcomingDeadlines: processRows(upcomingRows),
            recentlyCompleted: processRows(completedRows),
            statusDistribution: statusDist
        });

    } catch (error) {
        console.error('Dashboard Stats API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
