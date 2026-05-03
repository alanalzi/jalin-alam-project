import createConnection from "@/app/lib/db";

export async function GET(req) {
  let connection;
  try {
    connection = await createConnection();
    // 1. Create edit_requests table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS edit_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        target_type ENUM('product', 'inquiry') NOT NULL,
        target_id INT NOT NULL,
        requested_by INT NOT NULL,
        old_data JSON NOT NULL,
        new_data JSON NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        validated_by INT,
        validation_notes TEXT,
        FOREIGN KEY (requested_by) REFERENCES users(id),
        FOREIGN KEY (validated_by) REFERENCES users(id)
      )
    `);

    return Response.json({ message: "Edit Requests table initialized successfully." });
  } catch (error) {
    console.error("Setup Edit Requests Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
