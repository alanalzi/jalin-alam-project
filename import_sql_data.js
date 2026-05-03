const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function importData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jalin_alam_db'
  });

  try {
    console.log('Reading jalin_alam_db.sql...');
    const sql = fs.readFileSync(path.join(__dirname, 'jalin_alam_db.sql'), 'utf8');

    // Split SQL by semicolon, but be careful with semicolons inside strings.
    // A simple split will work for standard phpMyAdmin dumps if there are no complex triggers/stored procs.
    const statements = sql.split(/;\s*$/m);

    console.log(`Executing ${statements.length} statements...`);
    for (let statement of statements) {
      statement = statement.trim();
      if (!statement) continue;

      try {
        await connection.query(statement);
      } catch (err) {
        // Ignore "table already exists" errors
        if (err.code === 'ER_TABLE_EXISTS_ERROR') {
          // console.log(`Table already exists, skipping...`);
        } else if (err.code === 'ER_DUP_ENTRY') {
          // console.log(`Duplicate entry, skipping...`);
        } else {
          console.error(`Statement failed: ${statement.substring(0, 50)}...`);
          console.error(`Error: ${err.message}`);
        }
      }
    }
    console.log('Data import finished (with some skips for existing structures)!');

  } catch (error) {
    console.error('Import process failed:', error);
  } finally {
    await connection.end();
  }
}

importData();
