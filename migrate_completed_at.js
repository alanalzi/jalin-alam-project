import mysql from 'mysql2/promise';

async function migrate() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'jalin_alam_db',
    });

    try {
        console.log('Adding completed_at column to products table...');
        
        // Check if column exists first to avoid error
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'products' 
            AND COLUMN_NAME = 'completed_at'
            AND TABLE_SCHEMA = 'jalin_alam_db'`);

        if (columns.length === 0) {
            await connection.execute(`
                ALTER TABLE products 
                ADD COLUMN completed_at DATETIME NULL AFTER deadline
            `);
            console.log('Column "completed_at" added successfully!');
        } else {
            console.log('Column "completed_at" already exists.');
        }

    } catch (error) {
        console.error('Migration Error:', error);
    } finally {
        await connection.end();
    }
}

migrate();
