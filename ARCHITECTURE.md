# Robot Shop - Architecture Documentation

## Overview

Robot Shop is a microservices-based e-commerce application designed to demonstrate modern cloud-native architecture patterns with comprehensive monitoring via Instana APM.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                    (React + Nginx)                           │
│                       Port: 80                               │
└────────────┬────────────────────────────────────────────────┘
             │
             │ HTTP/REST
             │
┌────────────┴────────────────────────────────────────────────┐
│                    Backend Services                          │
├──────────────────┬──────────────────┬──────────────────────┤
│  Inventory       │  Order           │  User                │
│  Service         │  Service         │  Service             │
│  Port: 3001      │  Port: 3002      │  Port: 3003          │
│                  │                  │                      │
│  • Robot catalog │  • Order mgmt    │  • Authentication    │
│  • Stock mgmt    │  • Payment       │  • User profiles     │
│  • Categories    │  • History       │  • JWT tokens        │
└────────┬─────────┴────────┬─────────┴──────────┬───────────┘
         │                  │                    │
         │                  │                    │
         └──────────────────┴────────────────────┘
                            │
                            │ PostgreSQL Protocol
                            │
                   ┌────────┴────────┐
                   │   PostgreSQL    │
                   │   Database      │
                   │   Port: 5432    │
                   └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Load Generator                            │
│              (Automated Traffic Generation)                  │
│                                                              │
│  • Generates requests every 2 seconds                       │
│  • Mix of successful and failed requests                    │
│  • Calls all microservices                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Instana APM                               │
│                  (Monitoring & Tracing)                      │
│                                                              │
│  • Automatic instrumentation                                │
│  • Distributed tracing                                      │
│  • Service dependency mapping                               │
│  • Performance metrics                                      │
└─────────────────────────────────────────────────────────────┘
```

## Components

### Frontend Service

**Technology:** React 18 + Vite + Nginx

**Responsibilities:**
- User interface for browsing robots
- Shopping cart management
- User authentication UI
- Order placement and history

**Key Features:**
- Single Page Application (SPA)
- Responsive design
- Client-side routing
- Environment-based configuration

**Endpoints:**
- `/` - Home page with robot catalog
- `/login` - User login
- `/register` - User registration
- `/robot/:id` - Robot details and ordering
- `/orders` - Order history

### Inventory Service

**Technology:** Node.js + Express + PostgreSQL

**Port:** 3001

**Responsibilities:**
- Manage robot catalog
- Track stock levels
- Handle stock reservations
- Provide product categories

**API Endpoints:**
- `GET /api/inventory/robots` - List all robots
- `GET /api/inventory/robots/:id` - Get robot details
- `POST /api/inventory/check-stock` - Check stock availability
- `POST /api/inventory/reserve` - Reserve stock for order
- `GET /api/inventory/categories` - Get product categories

**Database Schema:**
```sql
robots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  model VARCHAR(100),
  description TEXT,
  price DECIMAL(10, 2),
  stock INTEGER,
  image_url VARCHAR(500),
  category VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Order Service

**Technology:** Node.js + Express + PostgreSQL + Axios

**Port:** 3002

**Responsibilities:**
- Process customer orders
- Coordinate with inventory and user services
- Manage order lifecycle
- Track order history

**API Endpoints:**
- `POST /api/orders` - Create new order
- `GET /api/orders/user/:userId` - Get user orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/orders/stats/summary` - Get order statistics

**Database Schema:**
```sql
orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  robot_id INTEGER,
  robot_name VARCHAR(255),
  quantity INTEGER,
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  status VARCHAR(50),
  shipping_address TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Service Dependencies:**
- Calls Inventory Service to verify stock and reserve items
- Calls User Service to verify user existence

### User Service

**Technology:** Node.js + Express + PostgreSQL + bcrypt + JWT

**Port:** 3003

**Responsibilities:**
- User authentication and authorization
- User profile management
- JWT token generation and validation
- Password hashing and verification

**API Endpoints:**
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile (authenticated)
- `PUT /api/users/profile` - Update profile (authenticated)
- `GET /api/users/:id` - Get user by ID (internal)

**Database Schema:**
```sql
users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Security:**
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens for session management
- Token expiration: 24 hours

### Load Generator

**Technology:** Node.js + Axios

**Responsibilities:**
- Generate realistic traffic patterns
- Create both successful and failed requests
- Test all microservices
- Provide data for Instana monitoring

**Traffic Pattern:**
- Interval: 2 seconds (configurable)
- Request Distribution:
  - 30% - Get all robots
  - 20% - Get robot by ID
  - 15% - Check stock
  - 10% - Get categories
  - 10% - Get user profile (expected to fail - no auth)
  - 10% - Get orders (may fail - invalid user)
  - 5% - Get order statistics

**Monitoring:**
- Tracks success/failure rates
- Logs all requests with timestamps
- Provides statistics every 30 seconds

### Database

**Technology:** PostgreSQL 15

**Configuration:**
- Single StatefulSet with persistent storage
- 1Gi persistent volume
- Automatic initialization of schemas
- Shared by all backend services

**Tables:**
- `robots` - Product catalog
- `orders` - Order records
- `users` - User accounts

## Instana Integration

### Instrumentation

All services use `@instana/collector` for automatic instrumentation:

**Features:**
- Automatic HTTP request tracing
- Database query monitoring
- Service dependency mapping
- Custom tags for environment and version
- Error tracking and alerting

**Configuration:**
```javascript
require('@instana/collector')({
  tracing: {
    enabled: true,
    automaticTracingEnabled: true,
    stackTraceLength: 10,
  },
  reporting: {
    host: process.env.INSTANA_AGENT_HOST,
    port: 443,
    protocol: 'https',
  },
  agentKey: process.env.INSTANA_AGENT_KEY,
  serviceName: 'robot-shop-<service>',
  tags: {
    environment: 'development',
    component: '<service-name>',
    version: '1.0.0',
  },
});
```

### Monitored Metrics

- Request rate and latency
- Error rates and types
- Service dependencies
- Database query performance
- Memory and CPU usage
- Custom business metrics

## Deployment Architecture

### Kubernetes Resources

**Namespaces:**
- `robot-shop-dev` - Development environment

**Deployments:**
- `inventory-service` - 2 replicas
- `order-service` - 2 replicas
- `user-service` - 2 replicas
- `frontend` - 2 replicas
- `load-generator` - 1 replica

**StatefulSets:**
- `postgres` - 1 replica with persistent storage

**Services:**
- `inventory-service` - ClusterIP
- `order-service` - ClusterIP
- `user-service` - ClusterIP
- `frontend` - NodePort
- `postgres` - ClusterIP

**Secrets:**
- `postgres-secret` - Database credentials
- `instana-secret` - Instana configuration
- `jwt-secret` - JWT signing key

**ConfigMaps:**
- `frontend-config` - Frontend environment variables

### GitOps with ArgoCD

**Application Structure:**
```
gitops/
├── base/              # Base Kubernetes manifests
│   ├── database/
│   ├── inventory-service/
│   ├── order-service/
│   ├── user-service/
│   ├── frontend/
│   └── load-generator/
├── overlays/          # Environment-specific configs
│   └── dev/
└── argocd/           # ArgoCD application definition
```

**Deployment Flow:**
1. Code changes pushed to Git
2. Docker images built and tagged
3. ArgoCD detects changes
4. Automatic sync to Kubernetes
5. Health checks and rollout

## Security Considerations

### Authentication & Authorization
- JWT-based authentication
- Password hashing with bcrypt
- Token expiration (24 hours)
- Secure secret management

### Network Security
- Services communicate via ClusterIP
- Frontend exposed via NodePort
- Database not exposed externally
- TLS for Instana communication

### Secret Management
- Kubernetes Secrets for sensitive data
- Environment-based configuration
- Secrets not committed to Git
- Automatic secret generation option

## Scalability

### Horizontal Scaling
- All services support multiple replicas
- Stateless service design
- Load balancing via Kubernetes Services

### Database Scaling
- Single PostgreSQL instance (development)
- Can be upgraded to:
  - Read replicas
  - Connection pooling
  - Managed database service

### Performance Optimization
- Resource limits and requests defined
- Health checks for automatic recovery
- Efficient database queries
- Caching opportunities (future)

## Monitoring & Observability

### Instana APM
- Automatic service discovery
- Distributed tracing
- Performance metrics
- Error tracking

### Kubernetes Native
- Liveness probes
- Readiness probes
- Resource monitoring
- Event logging

### Application Logs
- Structured logging
- Request/response logging
- Error logging with stack traces
- Performance timing

## Future Enhancements

1. **Caching Layer:** Redis for session and catalog caching
2. **Message Queue:** RabbitMQ/Kafka for async processing
3. **API Gateway:** Kong/Nginx for unified API access
4. **Service Mesh:** Istio for advanced traffic management
5. **CI/CD Pipeline:** GitHub Actions/Jenkins for automation
6. **Multi-environment:** Production, staging, QA environments
7. **Database Replication:** High availability setup
8. **Backup & Recovery:** Automated backup strategies

---

Made with Bob