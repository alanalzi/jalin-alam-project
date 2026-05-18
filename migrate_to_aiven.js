const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function migrateToAiven() {
  console.log("=== Memulai Proses Pemindahan Database ke Aiven ===");

  // Pastikan variabel ENV sudah diubah ke Aiven
  const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '12345'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'defaultdb',
    multipleStatements: true,
    ssl: {
      rejectUnauthorized: false // Wajib untuk koneksi ke Cloud MySQL (Aiven)
    }
  };

  if (!dbConfig.host || dbConfig.host === '127.0.0.1' || dbConfig.host === 'localhost') {
    console.error("❌ ERROR: DB_HOST di .env.local masih localhost/127.0.0.1.");
    console.error("Silakan update file .env.local dengan Host dari Aiven terlebih dahulu!");
    process.exit(1);
  }

  let connection;
  try {
    console.log(`Menghubungkan ke Aiven (${dbConfig.host})...`);
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Berhasil terhubung ke Aiven!");

    // Baca file SQL
    const sqlFilePath = './jalin_alam_db.sql';
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ ERROR: File ${sqlFilePath} tidak ditemukan!`);
      process.exit(1);
    }

    console.log("Membaca file jalin_alam_db.sql...");
    const sqlString = fs.readFileSync(sqlFilePath, 'utf8');

    console.log("Menjalankan query untuk membuat tabel dan memasukkan data...");
    // Eksekusi semua query sekaligus
    await connection.query(sqlString);

    console.log("🎉 MANTAP! Semua tabel dan data berhasil dipindahkan ke Aiven!");
    console.log("Sekarang silakan update pengaturan Environment Variables di Netlify Anda.");

  } catch (error) {
    console.error("❌ Terjadi kesalahan saat migrasi:", error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Koneksi ditutup.");
    }
  }
}

migrateToAiven();
