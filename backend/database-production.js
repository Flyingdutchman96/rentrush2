import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

// Database helper functions with PostgreSQL syntax
const db = {
  async getAsync(sql, params = []) {
    const client = await pool.connect();
    try {
      // Convert SQLite syntax to PostgreSQL
      const pgSQL = sql.replace(/\?/g, (match, offset, string) => {
        const paramIndex = string.substring(0, offset).split('?').length;
        return `$${paramIndex}`;
      });
      
      console.log('Executing SQL:', pgSQL, 'Params:', params);
      const result = await client.query(pgSQL, params);
      return result.rows[0];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  async allAsync(sql, params = []) {
    const client = await pool.connect();
    try {
      // Convert SQLite syntax to PostgreSQL
      const pgSQL = sql.replace(/\?/g, (match, offset, string) => {
        const paramIndex = string.substring(0, offset).split('?').length;
        return `$${paramIndex}`;
      });
      
      console.log('Executing SQL:', pgSQL, 'Params:', params);
      const result = await client.query(pgSQL, params);
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  async runAsync(sql, params = []) {
    const client = await pool.connect();
    try {
      // Convert SQLite syntax to PostgreSQL and add RETURNING clause for INSERTs
      let pgSQL = sql.replace(/\?/g, (match, offset, string) => {
        const paramIndex = string.substring(0, offset).split('?').length;
        return `$${paramIndex}`;
      });
      
      // Add RETURNING id for INSERT statements
      if (pgSQL.toUpperCase().includes('INSERT INTO')) {
        pgSQL += ' RETURNING id';
      }
      
      console.log('Executing SQL:', pgSQL, 'Params:', params);
      const result = await client.query(pgSQL, params);
      
      return { 
        lastID: result.rows[0]?.id, 
        changes: result.rowCount 
      };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
};

export default db;