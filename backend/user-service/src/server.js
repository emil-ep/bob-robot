// Initialize Instana first
require('./instana');

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'robot-shop-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'robotshop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service' });
});

// Initialize database
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create a default test user
    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name)
         VALUES ($1, $2, $3, $4)`,
        ['test@robotshop.com', hashedPassword, 'Test', 'User']
      );
      console.log('Created default test user: test@robotshop.com / password123');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Register new user
app.post('/api/users/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty(),
  body('lastName').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password, firstName, lastName, phone, address } = req.body;

  try {
    // Check if user already exists
    const { rows: existingUsers } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, phone, address, created_at`,
      [email, hashedPassword, firstName, lastName, phone, address]
    );

    const user = rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          address: user.address
        },
        token
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, error: 'Failed to register user' });
  }
});

// Login
app.post('/api/users/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Find user
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          address: user.address
        },
        token
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, error: 'Failed to login' });
  }
});

// Get user profile
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, first_name, last_name, phone, address, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        address: user.address,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// Update user profile
app.put('/api/users/profile', authenticateToken, [
  body('firstName').optional().notEmpty(),
  body('lastName').optional().notEmpty(),
  body('phone').optional(),
  body('address').optional()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { firstName, lastName, phone, address } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, first_name, last_name, phone, address`,
      [firstName, lastName, phone, address, req.user.id]
    );

    const user = rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// Get user by ID (for other services)
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// Start server
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
  });
}

startServer();

// Made with Bob