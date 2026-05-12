// Instana tracing initialization for Order Service
// This file MUST be required before any other modules
require('@instana/collector')({
  tracing: {
    enabled: process.env.INSTANA_ENABLED !== 'false',
    automaticTracingEnabled: true,
    stackTraceLength: 10,
  },
  reporting: {
    host: process.env.INSTANA_AGENT_HOST || 'ingress-red-saas.instana.io',
    port: process.env.INSTANA_AGENT_PORT || 443,
    protocol: 'https',
  },
  agentKey: process.env.INSTANA_AGENT_KEY,
  serviceName: process.env.INSTANA_SERVICE_NAME || 'robot-shop-order',
  tags: {
    environment: process.env.NODE_ENV || 'development',
    component: 'order-service',
    version: process.env.APP_VERSION || '1.0.0',
  },
});

console.log('Instana tracing initialized for Order Service');

// Made with Bob