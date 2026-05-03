import getConnection from '@/app/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const connection = await getConnection();

        // 1. Get raw product data (needed to calculate status based on deadline)
        // We could do this in SQL, but since we have "isLate" logic dependent on JS dates sometimes, 
        // let's try to do as much as possible in SQL for performance, or fetch relevant fields.
        // Logic: Late if deadline < CURDATE() AND status != 'Done' (if we had completed status)
        // Since we only have "Ongoing" vs "Late" driven by deadline:

        // Total Products
        const [totalRows] = await connection.execute('SELECT COUNT(*) as count FROM products');
        const totalProducts = totalRows[0].count;

        // 1. Completion Rate (Average of all product's checklists)
        // We get the average percentage of all active and completed products
        const [progressRows] = await connection.execute(`
            SELECT COALESCE(ROUND(AVG(overall_progress)), 0) as avg_rate
            FROM (
                SELECT AVG(pc.percentage) as overall_progress
                FROM products p
                LEFT JOIN product_checklists pc ON p.id = pc.product_id
                GROUP BY p.id
            ) as subquery
        `);
        const completionRate = progressRows[0].avg_rate;

        // 2. Late Products (Deadline < Today AND NOT Done/Selesai)
        const [lateRows] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM products 
            WHERE deadline < CURDATE() 
            AND (status != 'Done' AND status != 'Selesai' OR status IS NULL)
        `);
        const lateProducts = lateRows[0].count;

        // 3. Near Deadline Products (Next 7 Days AND NOT Done/Selesai)
        const [nearRows] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM products 
            WHERE deadline BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) 
            AND (status != 'Done' AND status != 'Selesai' OR status IS NULL)
        `);
        const nearDeadlineCount = nearRows[0].count;

        // 4. Ongoing Products (NOT Done/Selesai)
        const [ongoingRows] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM products 
            WHERE (status != 'Done' AND status != 'Selesai' OR status IS NULL)
        `);
        const ongoingProducts = ongoingRows[0].count;

        // All Active Products (Limit 10) with Task Progress Details
        const [upcomingRows] = await connection.execute(`
            SELECT 
                p.id, p.name, p.deadline, p.category, p.inquiry_code, 
                CASE 
                    WHEN (SELECT COALESCE(ROUND(AVG(pc2.percentage)), 0) FROM product_checklists pc2 WHERE pc2.product_id = p.id) = 100 AND p.deadline < CURDATE() THEN 'Late Done'
                    WHEN (p.status != 'Done' AND p.status != 'Selesai' OR p.status IS NULL) AND p.deadline < CURDATE() THEN 'Late'
                    ELSE p.status
                END as status,
                COUNT(pc.id) as total_tasks,
                SUM(CASE WHEN pc.percentage = 100 THEN 1 ELSE 0 END) as completed_tasks,
                COALESCE(ROUND(AVG(pc.percentage)), 0) AS overallChecklistPercentage
            FROM products p
            LEFT JOIN product_checklists pc ON p.id = pc.product_id
            WHERE (p.status != 'Done' AND p.status != 'Selesai') OR p.status IS NULL
            GROUP BY p.id
            ORDER BY 
                CASE WHEN p.deadline IS NULL THEN 1 ELSE 0 END,
                p.deadline ASC 
            LIMIT 10
        `);

        return NextResponse.json({
            totalProducts,
            lateProducts,
            nearDeadlineCount,
            ongoingProducts,
            completionRate,
            upcomingDeadlines: upcomingRows
        });


    } catch (error) {
        console.error("Dashboard Stats API Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
