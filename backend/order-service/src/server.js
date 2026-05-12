// Initialize Instana first
require('./instana');

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3002;

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

// Service URLs
const INVENTORY_SERVICE = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:3001';
const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://user-service:3003';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'order-service' });
});

// Initialize database
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        robot_id INTEGER NOT NULL,
        robot_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        shipping_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Create new order
app.post('/api/orders', [
  body('userId').isInt(),
  body('robotId').isInt(),
  body('quantity').isInt({ min: 1 }),
  body('shippingAddress').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { userId, robotId, quantity, shippingAddress } = req.body;

  try {
    // Verify user exists
    try {
      await axios.get(`${USER_SERVICE}/api/users/${userId}`);
    } catch (error) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get robot details from inventory service
    let robot;
    try {
      const response = await axios.get(`${INVENTORY_SERVICE}/api/inventory/robots/${robotId}`);
      robot = response.data.data;
    } catch (error) {
      return res.status(404).json({ success: false, error: 'Robot not found' });
    }

    // Reserve stock
    try {
      await axios.post(`${INVENTORY_SERVICE}/api/inventory/reserve`, {
        robotId,
        quantity
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.response?.data?.error || 'Failed to reserve stock'
      });
    }

    // Create order
    const totalPrice = robot.price * quantity;
    const { rows } = await pool.query(
      `INSERT INTO orders (user_id, robot_id, robot_name, quantity, unit_price, total_price, shipping_address, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, robotId, robot.name, quantity, robot.price, totalPrice, shippingAddress, 'confirmed']
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// Get all orders for a user
app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// Get order by ID
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

// Update order status
app.put('/api/orders/:id/status', [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { status } = req.body;

    const { rows } = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
});

// Get order statistics
app.get('/api/orders/stats/summary', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_price) as total_revenue,
        AVG(total_price) as average_order_value,
        COUNT(DISTINCT user_id) as unique_customers
      FROM orders
    `);

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// Get all orders (admin)
app.get('/api/orders', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let query = 'SELECT * FROM orders';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// Start server
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Order Service running on port ${PORT}`);
  });
}

startServer();

// Made with Bob