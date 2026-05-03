const mysql = require('mysql2/promise');
async function test() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'jalin_alam_db'
  });
  try {
    const [rows] = await connection.execute(`
      SELECT
        i.id,
        i.inquiry_code,
        i.customer_name,
        i.customer_email,
        i.customer_phone,
        i.customer_address,
        i.product_name,
        i.product_description,
        i.customer_request,
        i.request_date,
        i.image_deadline,
        i.order_quantity,
        i.created_at,
        i.updated_at,
        GROUP_CONCAT(DISTINCT ii.image_url ORDER BY ii.id ASC) AS images,
        GROUP_CONCAT(DISTINCT CONCAT(ia.user_id, '|', u.name)) AS assigneesData
      FROM
        inquiries i
      LEFT JOIN
        inquiry_images ii ON i.id = ii.inquiry_id
      LEFT JOIN
        inquiry_assignees ia ON i.id = ia.inquiry_id
      LEFT JOIN
        users u ON ia.user_id = u.id
      GROUP BY
        i.id, i.inquiry_code, i.customer_name, i.customer_email, i.customer_phone, i.customer_address, i.product_name, i.product_description, i.customer_request, i.request_date, i.image_deadline, i.order_quantity, i.created_at, i.updated_at
      ORDER BY i.created_at DESC
    `);
    console.log("Success", rows.length);
  } catch(e) {
    console.error(e);
  } finally { process.exit(); }
} test();
