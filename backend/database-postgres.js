import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use environment variable for database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database helper functions
const db = {
  async getAsync(sql, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async allAsync(sql, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  },

  async runAsync(sql, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return { 
        lastID: result.rows[0]?.id, 
        changes: result.rowCount 
      };
    } finally {
      client.release();
    }
  }
};

export default db;