// Initialize Instana first
require('./instana');

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3001;

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
  res.json({ status: 'healthy', service: 'inventory-service' });
});

// Initialize database
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS robots (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        model VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        image_url VARCHAR(500),
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if we need to seed data
    const { rows } = await pool.query('SELECT COUNT(*) FROM robots');
    if (parseInt(rows[0].count) === 0) {
      await seedRobots();
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Seed initial robot data
async function seedRobots() {
  const robots = [
    {
      name: 'RoboHelper 3000',
      model: 'RH-3000',
      description: 'A versatile household assistant robot with AI capabilities',
      price: 1299.99,
      stock: 15,
      category: 'Household',
      image_url: 'https://via.placeholder.com/300x300?text=RoboHelper+3000'
    },
    {
      name: 'IndustrialBot Pro',
      model: 'IB-PRO',
      description: 'Heavy-duty industrial robot for manufacturing',
      price: 24999.99,
      stock: 5,
      category: 'Industrial',
      image_url: 'https://via.placeholder.com/300x300?text=IndustrialBot+Pro'
    },
    {
      name: 'MediBot Care',
      model: 'MB-CARE',
      description: 'Medical assistance robot for healthcare facilities',
      price: 15999.99,
      stock: 8,
      category: 'Medical',
      image_url: 'https://via.placeholder.com/300x300?text=MediBot+Care'
    },
    {
      name: 'EduBot Junior',
      model: 'EB-JR',
      description: 'Educational robot for children and schools',
      price: 599.99,
      stock: 25,
      category: 'Education',
      image_url: 'https://via.placeholder.com/300x300?text=EduBot+Junior'
    },
    {
      name: 'SecurityBot X1',
      model: 'SB-X1',
      description: 'Advanced security and surveillance robot',
      price: 8999.99,
      stock: 10,
      category: 'Security',
      image_url: 'https://via.placeholder.com/300x300?text=SecurityBot+X1'
    },
    {
      name: 'CleanBot Ultra',
      model: 'CB-ULTRA',
      description: 'Autonomous cleaning robot for large spaces',
      price: 2499.99,
      stock: 20,
      category: 'Household',
      image_url: 'https://via.placeholder.com/300x300?text=CleanBot+Ultra'
    }
  ];

  for (const robot of robots) {
    await pool.query(
      `INSERT INTO robots (name, model, description, price, stock, category, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [robot.name, robot.model, robot.description, robot.price, robot.stock, robot.category, robot.image_url]
    );
  }

  console.log('Seeded robot inventory');
}

// Get all robots
app.get('/api/inventory/robots', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM robots WHERE stock > 0';
    const params = [];

    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching robots:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch robots' });
  }
});

// Get robot by ID
app.get('/api/inventory/robots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM robots WHERE id = $1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Robot not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching robot:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch robot' });
  }
});

// Check stock availability
app.post('/api/inventory/check-stock', async (req, res) => {
  try {
    const { robotId, quantity } = req.body;

    const { rows } = await pool.query(
      'SELECT id, name, stock FROM robots WHERE id = $1',
      [robotId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Robot not found' });
    }

    const robot = rows[0];
    const available = robot.stock >= quantity;

    res.json({
      success: true,
      available,
      currentStock: robot.stock,
      requestedQuantity: quantity
    });
  } catch (error) {
    console.error('Error checking stock:', error);
    res.status(500).json({ success: false, error: 'Failed to check stock' });
  }
});

// Reserve stock (called by order service)
app.post('/api/inventory/reserve', async (req, res) => {
  try {
    const { robotId, quantity } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        'SELECT id, stock FROM robots WHERE id = $1 FOR UPDATE',
        [robotId]
      );

      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Robot not found' });
      }

      const robot = rows[0];
      if (robot.stock < quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Insufficient stock',
          available: robot.stock
        });
      }

      await client.query(
        'UPDATE robots SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [quantity, robotId]
      );

      await client.query('COMMIT');

      res.json({ success: true, message: 'Stock reserved successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reserving stock:', error);
    res.status(500).json({ success: false, error: 'Failed to reserve stock' });
  }
});

// Get categories
app.get('/api/inventory/categories', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT DISTINCT category FROM robots WHERE category IS NOT NULL ORDER BY category'
    );
    res.json({ success: true, data: rows.map(r => r.category) });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// Start server
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Inventory Service running on port ${PORT}`);
  });
}

startServer();

// Made with Bob