const mysql = require('mysql2/promise');

async function updateDb() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jalin_alam_db'
  });

  try {
    // Check if column exists first
    const [cols] = await connection.query("SHOW COLUMNS FROM inquiries LIKE 'assignee_id'");
    if (cols.length === 0) {
      await connection.query("ALTER TABLE inquiries ADD COLUMN assignee_id INT DEFAULT NULL;");
      console.log("Added assignee_id column to inquiries table.");
    } else {
      console.log("assignee_id column already exists.");
    }
  } catch (err) {
    console.error("Error updating db:", err);
  } finally {
    process.exit();
  }
}

updateDb();
