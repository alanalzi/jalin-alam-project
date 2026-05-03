import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jalin_alam_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Singleton pattern to prevent multiple pools during HMR
let pool;

if (process.env.NODE_ENV === 'production') {
  pool = mysql.createPool(dbConfig);
} else {
  if (!global.dbPool) {
    console.log('Creating new Global DB Pool...');
    global.dbPool = mysql.createPool(dbConfig);
  }
  pool = global.dbPool;
}

export default async function createConnection() {
  return pool.getConnection();
}
