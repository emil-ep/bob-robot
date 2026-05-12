// Initialize Instana first
require('./instana');

const axios = require('axios');

// Service URLs
const INVENTORY_SERVICE = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:3001';
const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || 'http://order-service:3002';
const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://user-service:3000';

// Interval in milliseconds (default: 2 seconds)
const INTERVAL = parseInt(process.env.LOAD_INTERVAL || '2000');

// Statistics
let stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  byService: {
    inventory: { total: 0, success: 0, failed: 0 },
    order: { total: 0, success: 0, failed: 0 },
    user: { total: 0, success: 0, failed: 0 }
  },
  startTime: new Date()
};

// Helper to determine if request should fail based on service failure rate
function shouldFail(service) {
  const random = Math.random() * 100;
  switch(service) {
    case 'inventory':
      return random < 20; // 20% failure rate
    case 'user':
      return random < 10; // 10% failure rate
    case 'order':
      return false; // 0% failure rate (100% success)
    default:
      return false;
  }
}

// API endpoints to test with balanced distribution
const endpoints = [
  // Inventory Service (30% of traffic)
  {
    name: 'Get All Robots',
    service: 'inventory',
    method: 'GET',
    url: `${INVENTORY_SERVICE}/api/inventory/robots`,
    weight: 10
  },
  {
    name: 'Get Robot by ID',
    service: 'inventory',
    method: 'GET',
    url: `${INVENTORY_SERVICE}/api/inventory/robots/1`,
    weight: 8
  },
  {
    name: 'Get Categories',
    service: 'inventory',
    method: 'GET',
    url: `${INVENTORY_SERVICE}/api/inventory/categories`,
    weight: 7
  },
  {
    name: 'Check Stock',
    service: 'inventory',
    method: 'POST',
    url: `${INVENTORY_SERVICE}/api/inventory/check-stock`,
    data: { robotId: 1, quantity: 1 },
    weight: 5
  },
  
  // User Service (35% of traffic)
  {
    name: 'Register User',
    service: 'user',
    method: 'POST',
    url: `${USER_SERVICE}/api/users/register`,
    data: () => ({
      email: `user${Date.now()}@test.com`,
      password: 'password123',
      name: 'Test User'
    }),
    weight: 10
  },
  {
    name: 'Login User',
    service: 'user',
    method: 'POST',
    url: `${USER_SERVICE}/api/users/login`,
    data: { email: 'test@robotshop.com', password: 'password123' },
    weight: 12
  },
  {
    name: 'Get User Profile',
    service: 'user',
    method: 'GET',
    url: `${USER_SERVICE}/api/users/profile`,
    headers: () => ({ 'Authorization': 'Bearer fake-token-for-testing' }),
    weight: 8
  },
  {
    name: 'Health Check User',
    service: 'user',
    method: 'GET',
    url: `${USER_SERVICE}/health`,
    weight: 5
  },
  
  // Order Service (35% of traffic)
  {
    name: 'Create Order',
    service: 'order',
    method: 'POST',
    url: `${ORDER_SERVICE}/api/orders`,
    data: () => ({
      userId: Math.floor(Math.random() * 100) + 1,
      items: [
        { robotId: 1, quantity: 1, price: 999.99 }
      ]
    }),
    headers: () => ({ 'Authorization': 'Bearer fake-token-for-testing' }),
    weight: 12
  },
  {
    name: 'Get User Orders',
    service: 'order',
    method: 'GET',
    url: `${ORDER_SERVICE}/api/orders/user/${Math.floor(Math.random() * 100) + 1}`,
    weight: 10
  },
  {
    name: 'Get Order by ID',
    service: 'order',
    method: 'GET',
    url: `${ORDER_SERVICE}/api/orders/${Math.floor(Math.random() * 100) + 1}`,
    weight: 8
  },
  {
    name: 'Get Order Stats',
    service: 'order',
    method: 'GET',
    url: `${ORDER_SERVICE}/api/orders/stats/summary`,
    weight: 5
  }
];

// Calculate cumulative weights for weighted random selection
let cumulativeWeights = [];
let totalWeight = 0;
endpoints.forEach(endpoint => {
  totalWeight += endpoint.weight;
  cumulativeWeights.push(totalWeight);
});

// Select random endpoint based on weights
function selectRandomEndpoint() {
  const random = Math.random() * totalWeight;
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (random < cumulativeWeights[i]) {
      return endpoints[i];
    }
  }
  return endpoints[endpoints.length - 1];
}

// Make API request
async function makeRequest(endpoint) {
  const startTime = Date.now();
  const service = endpoint.service;
  
  // Determine if this request should fail based on service failure rate
  const forceFail = shouldFail(service);
  
  try {
    const config = {
      method: endpoint.method,
      url: endpoint.url,
      timeout: 5000,
      validateStatus: () => true // Accept all status codes
    };

    if (endpoint.data) {
      config.data = typeof endpoint.data === 'function' ? endpoint.data() : endpoint.data;
    }

    if (endpoint.headers) {
      config.headers = typeof endpoint.headers === 'function' ? endpoint.headers() : endpoint.headers;
    }

    // Force failure by using invalid endpoint if needed
    if (forceFail) {
      config.url = config.url + '/force-error-' + Date.now();
    }

    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    stats.totalRequests++;
    stats.byService[service].total++;
    
    // Consider 2xx and 3xx as success, 4xx and 5xx as failure
    const isSuccess = response.status >= 200 && response.status < 400;
    
    if (isSuccess && !forceFail) {
      stats.successfulRequests++;
      stats.byService[service].success++;
      console.log(`✓ [${new Date().toISOString()}] [${service.toUpperCase()}] ${endpoint.name} - ${response.status} (${duration}ms)`);
    } else {
      stats.failedRequests++;
      stats.byService[service].failed++;
      console.log(`✗ [${new Date().toISOString()}] [${service.toUpperCase()}] ${endpoint.name} - ${response.status} (${duration}ms)`);
    }
    
    return isSuccess;
  } catch (error) {
    const duration = Date.now() - startTime;
    stats.totalRequests++;
    stats.failedRequests++;
    stats.byService[service].total++;
    stats.byService[service].failed++;
    
    const status = error.response?.status || 'ERROR';
    const message = error.code || error.message;
    
    console.log(`✗ [${new Date().toISOString()}] [${service.toUpperCase()}] ${endpoint.name} - ${status}: ${message} (${duration}ms)`);
    
    return false;
  }
}

// Print statistics
function printStats() {
  const uptime = Math.floor((Date.now() - stats.startTime.getTime()) / 1000);
  const successRate = stats.totalRequests > 0 
    ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)
    : 0;
  
  console.log('\n' + '='.repeat(70));
  console.log('LOAD GENERATOR STATISTICS');
  console.log('='.repeat(70));
  console.log(`Uptime: ${uptime}s`);
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Successful: ${stats.successfulRequests}`);
  console.log(`Failed: ${stats.failedRequests}`);
  console.log(`Overall Success Rate: ${successRate}%`);
  console.log(`Requests/sec: ${(stats.totalRequests / uptime).toFixed(2)}`);
  console.log('-'.repeat(70));
  
  // Per-service statistics
  Object.keys(stats.byService).forEach(service => {
    const s = stats.byService[service];
    const rate = s.total > 0 ? ((s.success / s.total) * 100).toFixed(2) : 0;
    console.log(`${service.toUpperCase().padEnd(12)} - Total: ${s.total.toString().padStart(4)}, Success: ${s.success.toString().padStart(4)}, Failed: ${s.failed.toString().padStart(4)}, Rate: ${rate}%`);
  });
  
  console.log('='.repeat(70) + '\n');
}

// Main loop
async function generateLoad() {
  console.log('🤖 Robot Shop Load Generator Started');
  console.log(`Interval: ${INTERVAL}ms (${(1000/INTERVAL).toFixed(2)} requests/second)`);
  console.log(`Services:`);
  console.log(`  - Inventory: ${INVENTORY_SERVICE} (Target: 80% success, 20% failure)`);
  console.log(`  - Order: ${ORDER_SERVICE} (Target: 100% success, 0% failure)`);
  console.log(`  - User: ${USER_SERVICE} (Target: 90% success, 10% failure)`);
  console.log('\nGenerating load...\n');

  // Print stats every 30 seconds
  setInterval(printStats, 30000);

  // Generate load continuously
  while (true) {
    const endpoint = selectRandomEndpoint();
    await makeRequest(endpoint);
    
    // Wait for the specified interval
    await new Promise(resolve => setTimeout(resolve, INTERVAL));
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  printStats();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  printStats();
  process.exit(0);
});

// Start the load generator
generateLoad().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Made with Bob
