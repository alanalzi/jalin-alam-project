import { NextResponse } from 'next/server';
import createConnection from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    let connection;
    try {
        connection = await createConnection();

        // Query to get products with their assignees, buyer (from inquiries), and suppliers
        const [rows] = await connection.execute(`
            SELECT 
                p.id,
                p.type,
                CASE WHEN p.type = 'Custom' THEN COALESCE(i.product_name, p.name) ELSE p.name END as product_name,
                CASE WHEN p.type = 'Custom' THEN COALESCE(i.product_description, p.description) ELSE p.description END as description,
                p.start_date as startDate,
                p.deadline,
                p.inquiry_code,
                i.customer_name as buyer_name,
                GROUP_CONCAT(DISTINCT CONCAT(u.id, '|', u.name, '|', u.role)) as productAssigneesData,
                GROUP_CONCAT(DISTINCT CONCAT(iu.id, '|', iu.name, '|', iu.role)) as inquiryAssigneesData,
                GROUP_CONCAT(DISTINCT s.name) as suppliersData
            FROM products p
            LEFT JOIN inquiries i ON p.inquiry_code = i.inquiry_code
            LEFT JOIN product_assignees pa ON p.id = pa.product_id
            LEFT JOIN users u ON pa.user_id = u.id
            LEFT JOIN inquiry_assignees ia ON i.id = ia.inquiry_id
            LEFT JOIN users iu ON ia.user_id = iu.id
            LEFT JOIN product_materials pm ON p.id = pm.product_id
            LEFT JOIN suppliers s ON pm.material_id = s.id
            WHERE p.validation_status = 'approved'
            GROUP BY p.id
            ORDER BY p.deadline ASC
        `);

        const workOrders = rows.map(row => {
            const assigneesRaw = row.productAssigneesData || row.inquiryAssigneesData;
            return {
                id: row.id,
                type: row.type,
                product_name: row.product_name,
                description: row.description,
                startDate: row.startDate,
                deadline: row.deadline,
                inquiry_code: row.inquiry_code,
                buyer_name: row.buyer_name || 'N/A',
                assignees: assigneesRaw ? assigneesRaw.split(',').map(item => {
                    const [id, name, role] = item.split('|');
                    return { id: parseInt(id), name, role };
                }) : [],
                suppliers: row.suppliersData ? row.suppliersData.split(',') : []
            };
        });

        return NextResponse.json(workOrders);
    } catch (error) {
        console.error('Work Order API Error:', error);
        return NextResponse.json({ message: 'Failed to fetch work orders', error: error.message }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
