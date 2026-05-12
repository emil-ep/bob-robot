# Robot Shop - Quick Start Guide

Get the Robot Shop application up and running in minutes!

## Prerequisites

- Kubernetes cluster (Minikube, Kind, or cloud provider)
- kubectl CLI installed and configured
- Docker installed (for building images)
- (Optional) ArgoCD installed for GitOps deployment

## Quick Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd robot-shop
```

### 2. Run the Installer

```bash
chmod +x install.sh
./install.sh
```

The installer will:
- Check prerequisites
- Authenticate with Docker Hub (to avoid rate limits)
- Build Docker images
- Configure secrets (Instana, JWT)
- Deploy the application
- Wait for all services to be ready

**Note:** You'll be prompted for Docker Hub credentials during installation to avoid rate limits. If you don't have an account, create one at https://hub.docker.com/signup (it's free).

### 3. Access the Application

After installation completes, you'll see the access URL:

```
Frontend: http://<node-ip>:<nodeport>
```

**Test Credentials:**
- Email: `test@robotshop.com`
- Password: `password123`

## What's Included

- **3 Backend Microservices:**
  - Inventory Service (Port 3001) - Robot catalog and stock management
  - Order Service (Port 3002) - Order processing
  - User Service (Port 3003) - Authentication and user management

- **Frontend:** React-based UI (Port 80)
- **Load Generator:** Automatic traffic generation every 2 seconds
- **PostgreSQL Database:** Persistent data storage
- **Instana Integration:** APM monitoring (when configured)

## Monitoring with Instana

### Configure Instana

During installation, you'll be prompted for:
- Instana Agent Key
- Instana Agent Host (default: ingress-red-saas.instana.io)

Or manually edit `gitops/overlays/dev/secrets.env`:

```bash
INSTANA_AGENT_KEY=your-key-here
INSTANA_AGENT_HOST=ingress-red-saas.instana.io
```

Then redeploy:

```bash
kubectl apply -k gitops/overlays/dev
```

### View Metrics

The load generator creates traffic patterns that you can monitor in Instana:
- Service dependencies
- Request traces
- Error rates
- Performance metrics

## Useful Commands

### View Application Status

```bash
# All pods
kubectl get pods -n robot-shop-dev

# All services
kubectl get svc -n robot-shop-dev

# Load generator logs
kubectl logs -f deployment/load-generator -n robot-shop-dev
```

### Port Forwarding (Alternative Access)

```bash
# Frontend
kubectl port-forward svc/frontend 8080:80 -n robot-shop-dev

# Inventory Service
kubectl port-forward svc/inventory-service 3001:3001 -n robot-shop-dev

# Order Service
kubectl port-forward svc/order-service 3002:3002 -n robot-shop-dev

# User Service
kubectl port-forward svc/user-service 3003:3003 -n robot-shop-dev
```

### View Logs

```bash
# Specific service
kubectl logs -f deployment/inventory-service -n robot-shop-dev
kubectl logs -f deployment/order-service -n robot-shop-dev
kubectl logs -f deployment/user-service -n robot-shop-dev
kubectl logs -f deployment/frontend -n robot-shop-dev

# Database
kubectl logs -f statefulset/postgres -n robot-shop-dev
```

## ArgoCD Deployment

If you have ArgoCD installed:

1. Update the repository URL in `gitops/argocd/application.yaml`
2. Run the installer and choose option 1 (ArgoCD)
3. Monitor deployment:

```bash
kubectl get application robot-shop-dev -n argocd
```

## Uninstallation

```bash
chmod +x uninstall.sh
./uninstall.sh
```

This removes all application resources but preserves:
- Secret files (for redeployment)
- Docker images (for faster rebuilds)

## Docker Hub Authentication

The installer automatically handles Docker Hub authentication to avoid rate limits.

### First Time Setup

When you run `./install.sh`, you'll be prompted:
```
Docker Hub Username: your-username
Docker Hub Password or Access Token: ********
```

### Saved Credentials

Your credentials are saved in `.docker-credentials` (excluded from git) for future builds.

To use saved credentials:
- The installer will detect and offer to use them
- Or run `./scripts/docker-login.sh` manually

### Using Access Tokens (Recommended)

Instead of your password, use a Docker Hub access token:
1. Go to https://hub.docker.com/settings/security
2. Create a new access token
3. Use the token as your password

## Troubleshooting

### Docker Rate Limit Error

If you see "429 Too Many Requests":
```bash
./scripts/docker-login.sh
```

Then retry the installation.

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n robot-shop-dev

# Check events
kubectl get events -n robot-shop-dev --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Check database is running
kubectl get pod -l app=postgres -n robot-shop-dev

# Check database logs
kubectl logs statefulset/postgres -n robot-shop-dev
```

### Image Pull Errors

Make sure Docker images are built:

```bash
docker images | grep robot-shop
```

If missing, rebuild:

```bash
docker build -t robot-shop/inventory-service:latest ./backend/inventory-service
docker build -t robot-shop/order-service:latest ./backend/order-service
docker build -t robot-shop/user-service:latest ./backend/user-service
docker build -t robot-shop/frontend:latest ./frontend
docker build -t robot-shop/load-generator:latest ./load-generator
```

## Next Steps

- Explore the [README.md](README.md) for detailed architecture
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Configure Instana for full monitoring capabilities
- Customize the load generator patterns
- Set up CI/CD pipelines

## Support

For issues or questions, please check the documentation or create an issue in the repository.

---

Made with Bob