// Initialize Instana first
require('./instana');

const axios = require('axios');

// Service URLs
const INVENTORY_SERVICE = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:3001';
const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || 'http://order-service:3002';
const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://user-service:3003';

// Interval in milliseconds (default: 2 seconds)
const INTERVAL = parseInt(process.env.LOAD_INTERVAL || '2000');

// Statistics
let stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  startTime: new Date()
};

// API endpoints to test
const endpoints = [
  {
    name: 'Get All Robots',
    method: 'GET',
    url: `${INVENTORY_SERVICE}/api/inventory/robots`,
    weight: 30 // 30% of requests
  },
  {
    name: 'Get Robot by ID',
    method: 'GET',
    url: `${INVENTORY_SERVICE}/api/inventory/robots/1`,
    weight: 20
  },
  {
    name: 'Get Categories',
    method: 'GET',
    url: `${INVENTORY_SERVICE}/api/inventory/categories`,
    weight: 10
  },
  {
    name: 'Check Stock',
    method: 'POST',
    url: `${INVENTORY_SERVICE}/api/inventory/check-stock`,
    data: { robotId: 1, quantity: 1 },
    weight: 15
  },
  {
    name: 'Get User Profile (Will Fail - No Auth)',
    method: 'GET',
    url: `${USER_SERVICE}/api/users/profile`,
    weight: 10,
    expectedToFail: true
  },
  {
    name: 'Get Orders (Will Fail - Invalid User)',
    method: 'GET',
    url: `${ORDER_SERVICE}/api/orders/user/999`,
    weight: 10
  },
  {
    name: 'Get Order Stats',
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
  
  try {
    const config = {
      method: endpoint.method,
      url: endpoint.url,
      timeout: 5000
    };

    if (endpoint.data) {
      config.data = endpoint.data;
    }

    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    stats.totalRequests++;
    stats.successfulRequests++;
    
    console.log(`✓ [${new Date().toISOString()}] ${endpoint.name} - ${response.status} (${duration}ms)`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    stats.totalRequests++;
    stats.failedRequests++;
    
    const status = error.response?.status || 'ERROR';
    const message = error.response?.data?.error || error.message;
    
    if (endpoint.expectedToFail) {
      console.log(`✓ [${new Date().toISOString()}] ${endpoint.name} - ${status} (Expected failure) (${duration}ms)`);
    } else {
      console.log(`✗ [${new Date().toISOString()}] ${endpoint.name} - ${status}: ${message} (${duration}ms)`);
    }
    
    return false;
  }
}

// Print statistics
function printStats() {
  const uptime = Math.floor((Date.now() - stats.startTime.getTime()) / 1000);
  const successRate = stats.totalRequests > 0 
    ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)
    : 0;
  
  console.log('\n' + '='.repeat(60));
  console.log('LOAD GENERATOR STATISTICS');
  console.log('='.repeat(60));
  console.log(`Uptime: ${uptime}s`);
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Successful: ${stats.successfulRequests}`);
  console.log(`Failed: ${stats.failedRequests}`);
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Requests/sec: ${(stats.totalRequests / uptime).toFixed(2)}`);
  console.log('='.repeat(60) + '\n');
}

// Main loop
async function generateLoad() {
  console.log('🤖 Robot Shop Load Generator Started');
  console.log(`Interval: ${INTERVAL}ms (${1000/INTERVAL} requests/second)`);
  console.log(`Services:`);
  console.log(`  - Inventory: ${INVENTORY_SERVICE}`);
  console.log(`  - Order: ${ORDER_SERVICE}`);
  console.log(`  - User: ${USER_SERVICE}`);
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