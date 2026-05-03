const db = require('./src/app/lib/db');
const createConnection = db.default || db;

async function repair() {
  console.log("=== Jalin Alam Database Repair Script ===");
  let connection;
  try {
    connection = await createConnection();

    // 1. Repair product_checklists
    console.log("Checking product_checklists...");
    try {
      await connection.execute("ALTER TABLE product_checklists ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
      console.log("Added created_at to product_checklists");
    } catch (e) { /* already exists */ }
    try {
      await connection.execute("ALTER TABLE product_checklists ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
      console.log("Added updated_at to product_checklists");
    } catch (e) { /* already exists */ }

    // 2. Repair suppliers
    console.log("Checking suppliers...");
    try {
      await connection.execute("ALTER TABLE suppliers ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
      console.log("Added created_at to suppliers");
    } catch (e) { /* already exists */ }
    try {
      await connection.execute("ALTER TABLE suppliers ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
      console.log("Added updated_at to suppliers");
    } catch (e) { /* already exists */ }

    // 3. Repair product_statuses
    console.log("Checking product_statuses...");
    try {
      await connection.execute("ALTER TABLE product_statuses ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
      console.log("Added created_at to product_statuses");
    } catch (e) { /* already exists */ }

    // 4. Ensure inquiry_assignees has id
    console.log("Checking inquiry_assignees...");
    try {
      await connection.execute("ALTER TABLE inquiry_assignees ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST");
      console.log("Added id to inquiry_assignees");
    } catch (e) { /* already exists or column count mismatch */ }

    console.log("\nRepair complete.");
  } catch (err) {
    console.error("Repair failed:", err);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

repair();
