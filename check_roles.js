const mysql = require('mysql2/promise');

async function getRoles() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jalin_alam_db'
  });

  try {
    const [rows] = await connection.execute('SELECT DISTINCT role FROM users');
    console.log("Roles found in DB:", rows.map(r => r.role).join(', '));
  } catch (err) {
    console.error("Error fetching roles:", err);
  } finally {
    process.exit();
  }
}

getRoles();
