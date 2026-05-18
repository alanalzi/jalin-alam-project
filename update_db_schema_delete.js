const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'jalin_alam_db'});
  await c.query("ALTER TABLE inquiries MODIFY COLUMN validation_status enum('pending','approved','rejected','pending_delete') DEFAULT 'approved'");
  await c.query("ALTER TABLE products MODIFY COLUMN validation_status enum('pending','approved','rejected','pending_delete') DEFAULT 'approved'");
  console.log('tables updated');
  c.end();
}
run();
