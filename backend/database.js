const mysql = require('mysql2/promise')
require('dotenv').config()

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'tripmate',
  password: process.env.DB_PASSWORD || 'ippl_jasmine',
  database: process.env.DB_NAME || 'tripmate_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
})

module.exports = db
