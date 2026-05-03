const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function repair() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'jalin_alam_db'
    });

    try {
        console.log('--- Starting Database Repair ---');

        // 1. Add custom_attributes to products table
        console.log('Checking "custom_attributes" column in "products"...');
        const [prodCols] = await connection.execute('SHOW COLUMNS FROM products LIKE "custom_attributes"');
        if (prodCols.length === 0) {
            console.log('Adding "custom_attributes" column...');
            await connection.execute('ALTER TABLE products ADD COLUMN custom_attributes JSON DEFAULT NULL');
            console.log('[OK] Column added.');
        } else {
            console.log('[SKIP] "custom_attributes" already exists.');
        }

        // 1b. Add completed_at to products table
        console.log('Checking "completed_at" column in "products"...');
        const [compCols] = await connection.execute('SHOW COLUMNS FROM products LIKE "completed_at"');
        if (compCols.length === 0) {
            console.log('Adding "completed_at" column...');
            await connection.execute('ALTER TABLE products ADD COLUMN completed_at DATETIME NULL AFTER deadline');
            console.log('[OK] Column added.');
        } else {
            console.log('[SKIP] "completed_at" already exists.');
        }

        // 2. Create checklist_templates table
        console.log('Checking "checklist_templates" table...');
        const [templatesTable] = await connection.execute('SHOW TABLES LIKE "checklist_templates"');
        if (templatesTable.length === 0) {
            console.log('Creating "checklist_templates" table...');
            await connection.execute(`
                CREATE TABLE checklist_templates (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('[OK] Table created.');
        } else {
            console.log('[SKIP] "checklist_templates" already exists.');
        }

        // 3. Create checklist_template_tasks table
        console.log('Checking "checklist_template_tasks" table...');
        const [tasksTable] = await connection.execute('SHOW TABLES LIKE "checklist_template_tasks"');
        if (tasksTable.length === 0) {
            console.log('Creating "checklist_template_tasks" table...');
            await connection.execute(`
                CREATE TABLE checklist_template_tasks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    template_id INT NOT NULL,
                    task_name VARCHAR(255) NOT NULL,
                    order_index INT DEFAULT 0,
                    FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
                )
            `);
            console.log('[OK] Table created.');
        } else {
            console.log('[SKIP] "checklist_template_tasks" already exists.');
        }

        // 4. Create product_assignees table
        console.log('Checking "product_assignees" table...');
        const [assigneesTable] = await connection.execute('SHOW TABLES LIKE "product_assignees"');
        if (assigneesTable.length === 0) {
            console.log('Creating "product_assignees" table...');
            await connection.execute(`
                CREATE TABLE product_assignees (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id INT NOT NULL,
                    user_id INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            console.log('[OK] Table created.');
        } else {
            console.log('[SKIP] "product_assignees" already exists.');
        }

        // 5. Create product_progress_logs table
        console.log('Checking "product_progress_logs" table...');
        const [progressLogsTable] = await connection.execute('SHOW TABLES LIKE "product_progress_logs"');
        if (progressLogsTable.length === 0) {
            console.log('Creating "product_progress_logs" table...');
            await connection.execute(`
                CREATE TABLE product_progress_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id INT NOT NULL,
                    comment TEXT,
                    image_url VARCHAR(255),
                    user_id INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                )
            `);
            console.log('[OK] Table created.');
        } else {
            console.log('[SKIP] "product_progress_logs" already exists.');
        }

        console.log('--- Repair Complete ---');
    } catch (error) {
        console.error('--- Repair Failed ---');
        console.error(error);
    } finally {
        await connection.end();
    }
}

repair();
