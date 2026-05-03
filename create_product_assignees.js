import mysql from 'mysql2/promise';

async function migrate() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'jalin_alam_db',
    });

    try {
        console.log('Creating product_assignees table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS product_assignees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('Table product_assignees created successfully!');

        // Optional: Sync existing inquiry assignees to their respective products
        console.log('Migrating existing inquiry assignees to product_assignees...');
        await connection.execute(`
            INSERT IGNORE INTO product_assignees (product_id, user_id)
            SELECT p.id, ia.user_id
            FROM products p
            JOIN inquiries i ON p.inquiry_code = i.inquiry_code
            JOIN inquiry_assignees ia ON i.id = ia.inquiry_id
        `);
        console.log('Migration of assignments completed!');

    } catch (error) {
        console.error('Migration Error:', error);
    } finally {
        await connection.end();
    }
}

migrate();
