const mysql = require('mysql2/promise');

async function updateDb() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jalin_alam_db'
  });

  try {
    // 1. Create junction table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inquiry_assignees (
        inquiry_id INT NOT NULL,
        user_id INT NOT NULL,
        PRIMARY KEY (inquiry_id, user_id),
        FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log("inquiry_assignees table created successfully.");

    // 2. Drop assignee_id from inquiries if it exists
    const [cols] = await connection.query("SHOW COLUMNS FROM inquiries LIKE 'assignee_id'");
    if (cols.length > 0) {
      await connection.query("ALTER TABLE inquiries DROP COLUMN assignee_id;");
      console.log("Dropped assignee_id from inquiries.");
    }
  } catch (err) {
    console.error("Error migrating DB:", err);
  } finally {
    process.exit();
  }
}

updateDb();
