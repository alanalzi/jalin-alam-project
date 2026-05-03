const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jalin_alam_db'
  });

  try {
    await connection.query("ALTER TABLE inquiries ADD COLUMN validation_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved'");
    console.log("Added to inquiries");
  } catch (e) {
    console.log("Inquiries error (maybe exists):", e.message);
  }

  try {
    await connection.query("ALTER TABLE products ADD COLUMN validation_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved'");
    console.log("Added to products");
  } catch (e) {
    console.log("Products error (maybe exists):", e.message);
  }

  connection.end();
}
run();
