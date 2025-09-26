import sqlite3 from 'sqlite3';

// Create database connection
const db = new sqlite3.Database(process.env.DB_PATH || './database.sqlite');

// Custom promisified run method that preserves 'this' context
db.runAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function(err) {  // Note: using function() not arrow function
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

// Other async methods
db.getAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Create users table
const createUsersTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      
      -- Location preferences
      city TEXT,
      neighbourhoods TEXT,
      
      -- Rental preferences  
      min_price INTEGER,
      max_price INTEGER,
      min_beds INTEGER,
      floor_area INTEGER,
      furnished TEXT,
      nice_to_haves TEXT,
      also_search_for TEXT,
      show_only_for TEXT,
      
      -- Account status
      email_verified BOOLEAN DEFAULT FALSE,
      verification_token TEXT,
      token_expires_at DATETIME,
      
      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(sql, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('✅ Users table ready');
    }
  });
};

// Initialize database
createUsersTable();

export default db;