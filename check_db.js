const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jalin_alam_db'
  });

  const [inquiryCols] = await connection.query("SHOW COLUMNS FROM inquiries");
  console.log("Inquiries table columns:", inquiryCols.map(c => c.Field));

  const [userCols] = await connection.query("SHOW COLUMNS FROM users");
  console.log("Users table columns:", userCols.map(c => c.Field));

  const [users] = await connection.query("SELECT id, name, role FROM users LIMIT 5");
  console.log("Sample users:", users);

  process.exit();
}
check().catch(console.error);
