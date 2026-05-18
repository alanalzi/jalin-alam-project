const mysql = require('mysql2/promise');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
    const [key, ...value] = line.split('=');
    if (key && value) acc[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
    return acc;
}, {});

async function createHolidaysTable() {
    const connection = await mysql.createConnection({
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        port: env.DB_PORT || 3306,
        connectTimeout: 10000,
    });

    try {
        console.log("Connecting to database...");
        
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS holidays (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE NOT NULL,
                description VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_date (date)
            )
        `);
        console.log("Table 'holidays' created or already exists.");

        // Insert some default Indonesian holidays for 2024 as an example
        const defaultHolidays = [
            ['2024-01-01', 'Tahun Baru 2024 Masehi'],
            ['2024-02-08', 'Isra Mikraj Nabi Muhammad SAW'],
            ['2024-02-10', 'Tahun Baru Imlek 2575 Kongzili'],
            ['2024-03-11', 'Hari Suci Nyepi Tahun Baru Saka 1946'],
            ['2024-03-29', 'Wafat Yesus Kristus'],
            ['2024-03-31', 'Hari Paskah'],
            ['2024-04-10', 'Hari Raya Idul Fitri 1445 Hijriah'],
            ['2024-04-11', 'Hari Raya Idul Fitri 1445 Hijriah'],
            ['2024-05-01', 'Hari Buruh Internasional'],
            ['2024-05-09', 'Kenaikan Yesus Kristus'],
            ['2024-05-23', 'Hari Raya Waisak 2568 BE'],
            ['2024-06-01', 'Hari Lahir Pancasila'],
            ['2024-06-17', 'Hari Raya Idul Adha 1445 Hijriah'],
            ['2024-07-07', 'Tahun Baru Islam 1446 Hijriah'],
            ['2024-08-17', 'Hari Kemerdekaan Republik Indonesia'],
            ['2024-09-16', 'Maulid Nabi Muhammad SAW'],
            ['2024-12-25', 'Hari Raya Natal']
        ];

        for (const holiday of defaultHolidays) {
            try {
                await connection.execute(
                    'INSERT IGNORE INTO holidays (date, description) VALUES (?, ?)',
                    holiday
                );
            } catch (e) {
                // Ignore duplicates
            }
        }
        console.log("Default holidays inserted.");

    } catch (error) {
        console.error("Error creating holidays table:", error);
    } finally {
        await connection.end();
        console.log("Database connection closed.");
    }
}

createHolidaysTable();
