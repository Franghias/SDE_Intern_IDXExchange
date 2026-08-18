const mysql = require('mysql2/promise');

// Check for Railway / cloud connection URL (MYSQL_URL, MYSQL_PUBLIC_URL, DATABASE_URL)
const connectionUri =
  process.env.MYSQL_URL ||
  process.env.MYSQL_PUBLIC_URL ||
  process.env.DATABASE_URL ||
  process.env.DB_URL;

let pool;

if (connectionUri) {
  pool = mysql.createPool(connectionUri);
} else {
  pool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME,
    port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT, 10) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

module.exports = pool;

