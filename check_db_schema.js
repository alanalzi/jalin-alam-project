const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jalin_alam_db'
  });

  try {
    const [rows] = await connection.query("SHOW COLUMNS FROM inquiries LIKE 'validation_status'");
    console.log("Inquiries validation_status:", rows);
    const [rows2] = await connection.query("SHOW COLUMNS FROM products LIKE 'validation_status'");
    console.log("Products validation_status:", rows2);
  } catch (e) {
    console.log("Error:", e.message);
  }

  connection.end();
}
run();
