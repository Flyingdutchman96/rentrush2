import dotenv from 'dotenv';
dotenv.config();  // Move this to the top, before other imports

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from './database.js';
import { sendVerificationEmail } from './emailService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'RentRush API is running!', 
    endpoints: [
      'GET /api/test',
      'POST /api/auth/register',
      'POST /api/auth/login', 
      'GET /api/auth/verify/:token',
      'GET /api/user/preferences' 
    ]
  });
});

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      city,
      neighbourhoods,
      min_price,
      max_price,
      min_beds,
      floor_area,
      furnished,
      nice_to_haves,
      also_search_for,
      show_only_for
    } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Name, email, and password are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = await db.getAsync(
      'SELECT id FROM users WHERE email = ?', 
      [email]
    );

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email already registered' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verification_token = crypto.randomBytes(32).toString('hex');
    const token_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Insert user into database
    const result = await db.runAsync(`
      INSERT INTO users (
        email, password_hash, name, phone, city, neighbourhoods,
        min_price, max_price, min_beds, floor_area, furnished,
        nice_to_haves, also_search_for, show_only_for,
        verification_token, token_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      email, password_hash, name, phone, city, neighbourhoods,
      min_price, max_price, min_beds, floor_area, furnished,
      nice_to_haves, also_search_for, show_only_for,
      verification_token, token_expires_at
    ]);

    console.log('✅ User created:', { id: result.lastID, email });

    // Send verification email
    const emailSent = await sendVerificationEmail(email, name, verification_token);
    
    if (!emailSent) {
      console.error('❌ Failed to send verification email');
      // Don't fail registration if email fails
    }
    
    res.status(201).json({
      message: 'Account created successfully! Please check your email to verify your account.',
      userId: result.lastID
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Failed to create account. Please try again.' 
    });
  }
});

// Login endpoint (moved outside of registration endpoint)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await db.getAsync(`
      SELECT id, email, password_hash, name, email_verified 
      FROM users 
      WHERE email = ?
    `, [email]);

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(401).json({ 
        error: 'Please verify your email before logging in' 
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in:', { id: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again.' 
    });
  }
});
// Get user preferences endpoint (protected route)
app.get('/api/user/preferences', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user preferences from database
    const user = await db.getAsync(`
      SELECT name, email, city, neighbourhoods, min_price, max_price, 
             min_beds, floor_area, furnished, nice_to_haves, 
             also_search_for, show_only_for
      FROM users 
      WHERE id = ?
    `, [decoded.userId]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to load preferences' });
  }
});

// Email verification endpoint
app.get('/api/auth/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with this verification token
    const user = await db.getAsync(`
      SELECT id, email, name, verification_token, token_expires_at, email_verified 
      FROM users 
      WHERE verification_token = ?
    `, [token]);

    if (!user) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Invalid verification link</h2>
            <p>This verification link is not valid or has already been used.</p>
            <a href="http://localhost:8080/signup.html">Sign up again</a>
          </body>
        </html>
      `);
    }

    if (user.email_verified) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>✅ Email already verified</h2>
            <p>Your email is already verified. You can start using RentRush!</p>
            <a href="http://localhost:8080">Go to RentRush</a>
          </body>
        </html>
      `);
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(user.token_expires_at);
    
    if (now > expiresAt) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>⏰ Verification link expired</h2>
            <p>This verification link has expired. Please sign up again.</p>
            <a href="http://localhost:8080/signup.html">Sign up again</a>
          </body>
        </html>
      `);
    }

    // Verify the user
    await db.runAsync(`
      UPDATE users 
      SET email_verified = TRUE, verification_token = NULL, token_expires_at = NULL 
      WHERE id = ?
    `, [user.id]);

    console.log('✅ User verified:', { id: user.id, email: user.email });

    // Send success page
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <div style="background: #0b74ff; color: white; padding: 30px; border-radius: 10px; display: inline-block;">
            <h2>🎉 Email verified successfully!</h2>
            <p>Welcome to RentRush, ${user.name}!</p>
            <p>You'll start receiving rental alerts soon.</p>
          </div>
          <p style="margin-top: 30px;">
            <a href="http://localhost:8080" style="background: #0b74ff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px;">
              Go to RentRush
            </a>
          </p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Verification failed</h2>
          <p>Something went wrong. Please try again or contact support.</p>
        </body>
      </html>
    `);
  }
});

// Debug endpoint to view users (remove in production)
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.allAsync('SELECT id, email, name, city, email_verified, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});