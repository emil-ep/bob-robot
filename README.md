# Robot Shop - Microservices Application

A microservices-based robot shop application with Instana monitoring and ArgoCD deployment support.

## Architecture

### Backend Microservices
1. **Inventory Service** (Port 3001) - Manages robot inventory, stock levels, and product catalog
2. **Order Service** (Port 3002) - Handles order processing, order history, and payment
3. **User Service** (Port 3003) - Manages user authentication, registration, and profiles

### Frontend
- **React Frontend** (Port 3000) - User interface for browsing robots and placing orders

### Load Generator
- **Job Service** - Generates random API calls every 2 seconds (both successful and failed requests)

## Features

- ✅ Microservices architecture with 3 independent backend services
- ✅ React-based frontend
- ✅ Instana APM integration for monitoring
- ✅ ArgoCD GitOps deployment
- ✅ Kubernetes-native with Kustomize
- ✅ Automated load generation for testing
- ✅ PostgreSQL database for persistence
- ✅ Docker containerization

## Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl CLI
- ArgoCD (optional, for GitOps deployment)
- Docker (for building images)
- Instana account (for monitoring)

## Quick Start

### Installation

```bash
./install.sh
```

The installation script will:
1. Check prerequisites
2. Configure secrets (Instana keys, database credentials)
3. Deploy the application (via ArgoCD or kubectl)
4. Wait for all services to be ready
5. Display access URLs

### Uninstallation

```bash
./uninstall.sh
```

## Project Structure

```
robot-shop/
├── backend/
│   ├── inventory-service/    # Robot inventory management
│   ├── order-service/         # Order processing
│   └── user-service/          # User authentication
├── frontend/                  # React UI
├── load-generator/            # API load testing job
├── gitops/
│   ├── argocd/               # ArgoCD application
│   ├── base/                 # Base Kubernetes manifests
│   └── overlays/             # Environment-specific configs
└── scripts/                  # Helper scripts

```

## Services

### Inventory Service (Port 3001)
- `GET /api/inventory/robots` - List all robots
- `GET /api/inventory/robots/:id` - Get robot details
- `POST /api/inventory/robots` - Add new robot (admin)
- `PUT /api/inventory/robots/:id/stock` - Update stock

### Order Service (Port 3002)
- `POST /api/orders` - Create new order
- `GET /api/orders` - List user orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status

### User Service (Port 3003)
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile

## Monitoring with Instana

The application is instrumented with Instana APM:
- Automatic tracing for all HTTP requests
- Database query monitoring
- Service dependency mapping
- Custom tags for environment and version

Configure Instana by setting these environment variables:
- `INSTANA_AGENT_KEY` - Your Instana agent key
- `INSTANA_AGENT_HOST` - Instana backend host
- `INSTANA_ENABLED` - Enable/disable tracing

## Development

### Building Docker Images

```bash
# Build all services
docker build -t robot-shop/inventory-service:latest ./backend/inventory-service
docker build -t robot-shop/order-service:latest ./backend/order-service
docker build -t robot-shop/user-service:latest ./backend/user-service
docker build -t robot-shop/frontend:latest ./frontend
docker build -t robot-shop/load-generator:latest ./load-generator
```

### Local Development

Each service can be run independently:

```bash
cd backend/inventory-service
npm install
npm run dev
```

## Configuration

Configuration is managed through:
- Environment variables (via Kubernetes secrets)
- ConfigMaps for non-sensitive data
- Kustomize overlays for environment-specific settings

## Load Generator

The load generator creates realistic traffic patterns:
- Random successful requests (70%)
- Random failed requests (30%)
- Calls all microservices
- Runs every 2 seconds
- Helps test Instana monitoring

## License

MIT

## Made with Bob