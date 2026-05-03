const mysql = require('mysql2/promise');

async function restore() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jalin_alam_db'
  });

  try {
    console.log('Restoring database schema...');

    // 1. Create 'products' table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id int(11) NOT NULL AUTO_INCREMENT,
        name varchar(255) DEFAULT NULL,
        inquiry_code varchar(255) DEFAULT NULL,
        category varchar(100) DEFAULT NULL,
        description text DEFAULT NULL,
        start_date date DEFAULT NULL,
        deadline date DEFAULT NULL,
        created_at timestamp NOT NULL DEFAULT current_timestamp(),
        updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        status varchar(50) DEFAULT 'ongoing',
        type varchar(50) DEFAULT 'Standard',
        validation_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
        PRIMARY KEY (id),
        UNIQUE KEY inquiry_code (inquiry_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    console.log('[OK] products table created/exists.');

    // 2. Create 'product_images' table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id int(11) NOT NULL AUTO_INCREMENT,
        product_id int(11) NOT NULL,
        image_url varchar(255) NOT NULL,
        created_at timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (id),
        KEY product_id (product_id),
        CONSTRAINT product_images_ibfk_1 FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    console.log('[OK] product_images table created/exists.');

    // 3. Create 'product_checklists' table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_checklists (
        id int(11) NOT NULL AUTO_INCREMENT,
        product_id int(11) NOT NULL,
        task varchar(255) NOT NULL,
        percentage int(11) DEFAULT 0,
        PRIMARY KEY (id),
        KEY product_id (product_id),
        CONSTRAINT product_checklists_ibfk_1 FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    console.log('[OK] product_checklists table created/exists.');

    // 4. Create 'suppliers' table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id int(11) NOT NULL AUTO_INCREMENT,
        name varchar(255) NOT NULL,
        supplier_description varchar(255) DEFAULT '',
        contact_info_text varchar(255) DEFAULT '',
        PRIMARY KEY (id),
        UNIQUE KEY name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    console.log('[OK] suppliers table created/exists.');

    // 5. Create 'product_materials' table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_materials (
        id int(11) NOT NULL AUTO_INCREMENT,
        product_id int(11) NOT NULL,
        material_id int(11) NOT NULL,
        quantity_needed int(11) NOT NULL,
        PRIMARY KEY (id),
        KEY product_id (product_id),
        KEY material_id (material_id),
        CONSTRAINT product_materials_ibfk_1 FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        CONSTRAINT product_materials_ibfk_2 FOREIGN KEY (material_id) REFERENCES suppliers (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    console.log('[OK] product_materials table created/exists.');

    // 6. Create 'inquiry_assignees' table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inquiry_assignees (
        inquiry_id INT NOT NULL,
        user_id INT NOT NULL,
        PRIMARY KEY (inquiry_id, user_id),
        FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('[OK] inquiry_assignees table created/exists.');

    // 7. Create 'product_required_materials' table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_required_materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        material_name VARCHAR(255) NOT NULL,
        is_sourced BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);
    console.log('[OK] product_required_materials table created/exists.');

    // 8. Create 'notifications' table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        message VARCHAR(255) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        link VARCHAR(255) DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('[OK] notifications table created/exists.');

    // 9. Add 'validation_status' to 'inquiries' if missing
    try {
      const [cols] = await connection.query("SHOW COLUMNS FROM inquiries LIKE 'validation_status'");
      if (cols.length === 0) {
        await connection.query("ALTER TABLE inquiries ADD COLUMN validation_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved'");
        console.log('[OK] Added validation_status to inquiries.');
      } else {
        console.log('[OK] validation_status already exists in inquiries.');
      }
    } catch (e) {
      console.log('[ERROR] Adding validation_status to inquiries:', e.message);
    }

    console.log('Restoration complete!');
  } catch (error) {
    console.error('CRITICAL ERROR during restoration:', error);
  } finally {
    await connection.end();
  }
}

restore();
