#!/bin/bash

# Robot Shop Application Installation Script
# This script automates the complete installation process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Robot Shop Application Installer${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${GREEN}Checking prerequisites...${NC}"

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi
echo "  ✓ kubectl found"

if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi
echo "  ✓ Kubernetes cluster accessible"

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Warning: docker is not installed. You'll need it to build images.${NC}"
else
    echo "  ✓ docker found"
fi

# Check if ArgoCD is installed
ARGOCD_INSTALLED=false
if kubectl get namespace argocd &> /dev/null; then
    ARGOCD_INSTALLED=true
    echo "  ✓ ArgoCD detected"
fi

echo ""

# Ask deployment method
if [ "$ARGOCD_INSTALLED" = true ]; then
    echo -e "${YELLOW}Deployment Method:${NC}"
    echo "  1) ArgoCD (GitOps - Recommended)"
    echo "  2) Direct kubectl apply"
    echo ""
    read -p "Choose deployment method (1 or 2) [1]: " DEPLOY_METHOD
    DEPLOY_METHOD=${DEPLOY_METHOD:-1}
else
    echo -e "${YELLOW}ArgoCD not detected. Using direct kubectl deployment.${NC}"
    DEPLOY_METHOD=2
fi

echo ""

# Step 1: Build Docker images
echo -e "${GREEN}Step 1: Building Docker Images${NC}"
echo "----------------------------"
echo ""

read -p "Do you want to build Docker images? (Y/n): " BUILD_IMAGES
BUILD_IMAGES=${BUILD_IMAGES:-Y}

if [[ $BUILD_IMAGES =~ ^[Yy]$ ]]; then
    echo "Building images..."
    
    echo "  Building inventory-service..."
    docker build -t robot-shop/inventory-service:latest ./backend/inventory-service
    
    echo "  Building order-service..."
    docker build -t robot-shop/order-service:latest ./backend/order-service
    
    echo "  Building user-service..."
    docker build -t robot-shop/user-service:latest ./backend/user-service
    
    echo "  Building frontend..."
    docker build -t robot-shop/frontend:latest ./frontend
    
    echo "  Building load-generator..."
    docker build -t robot-shop/load-generator:latest ./load-generator
    
    echo -e "${GREEN}✓ All images built successfully${NC}"
else
    echo "Skipping image build. Make sure images are available."
fi

echo ""

# Step 2: Setup secrets
echo -e "${GREEN}Step 2: Configuring Secrets${NC}"
echo "----------------------------"
echo ""

if [ -f "gitops/overlays/dev/secrets.env" ]; then
    echo -e "${YELLOW}Secret file already exists.${NC}"
    read -p "Do you want to reconfigure secrets? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        chmod +x scripts/setup-secrets.sh
        ./scripts/setup-secrets.sh
    else
        echo "Using existing secret file..."
    fi
else
    chmod +x scripts/setup-secrets.sh
    ./scripts/setup-secrets.sh
fi

echo ""

# Step 3: Deploy application
echo -e "${GREEN}Step 3: Deploying Application${NC}"
echo "------------------------------"
echo ""

if [ "$DEPLOY_METHOD" = "1" ]; then
    # ArgoCD deployment
    echo "Deploying via ArgoCD..."
    echo ""
    echo -e "${YELLOW}Important: Update the repoURL in gitops/argocd/application.yaml${NC}"
    echo "  Current: https://github.com/YOUR_USERNAME/robot-shop.git"
    echo ""
    read -p "Have you updated the repoURL? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Please update the repoURL in gitops/argocd/application.yaml and run the installer again.${NC}"
        exit 1
    fi
    
    # Apply ArgoCD application
    kubectl apply -f gitops/argocd/application.yaml
    
    echo ""
    echo -e "${GREEN}✓ ArgoCD Application created${NC}"
    echo ""
    echo "Waiting for ArgoCD to sync..."
    sleep 5
    
    # Trigger sync
    kubectl patch application robot-shop-dev -n argocd \
      --type merge \
      -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{"revision":"main"}}}' 2>/dev/null || true
    
    echo ""
    echo -e "${YELLOW}Monitoring deployment (this may take 2-3 minutes)...${NC}"
    
else
    # Direct kubectl deployment
    echo "Deploying via kubectl..."
    kubectl apply -k gitops/overlays/dev
    
    echo ""
    echo -e "${GREEN}✓ Application deployed${NC}"
fi

echo ""

# Step 4: Wait for pods to be ready
echo -e "${GREEN}Step 4: Waiting for Pods to be Ready${NC}"
echo "-------------------------------------"
echo ""

echo "Waiting for database to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n robot-shop-dev --timeout=180s 2>/dev/null || true

echo "Waiting for services to be ready..."
kubectl wait --for=condition=ready pod -l app=inventory-service -n robot-shop-dev --timeout=180s 2>/dev/null || true
kubectl wait --for=condition=ready pod -l app=order-service -n robot-shop-dev --timeout=180s 2>/dev/null || true
kubectl wait --for=condition=ready pod -l app=user-service -n robot-shop-dev --timeout=180s 2>/dev/null || true
kubectl wait --for=condition=ready pod -l app=frontend -n robot-shop-dev --timeout=180s 2>/dev/null || true

echo ""
echo -e "${GREEN}✓ All pods are ready${NC}"
echo ""

# Step 5: Display access information
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Installation Complete! 🎉${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get NodePort info
FRONTEND_NODEPORT=$(kubectl get svc frontend -n robot-shop-dev -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "N/A")

# Get node IP
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "localhost")

echo -e "${GREEN}Access URLs:${NC}"
echo ""
echo "  Frontend (NodePort): http://${NODE_IP}:${FRONTEND_NODEPORT}"
echo ""
echo "  Test User Credentials:"
echo "    Email: test@robotshop.com"
echo "    Password: password123"
echo ""

if [ "$DEPLOY_METHOD" = "1" ]; then
    echo -e "${GREEN}ArgoCD Application:${NC}"
    echo "  kubectl get application robot-shop-dev -n argocd"
    echo ""
fi

echo -e "${GREEN}Useful Commands:${NC}"
echo "  View pods:        kubectl get pods -n robot-shop-dev"
echo "  View services:    kubectl get svc -n robot-shop-dev"
echo "  View logs:        kubectl logs -f <pod-name> -n robot-shop-dev"
echo "  Port forward:     kubectl port-forward svc/frontend 8080:80 -n robot-shop-dev"
echo "  Uninstall:        ./uninstall.sh"
echo ""

echo -e "${YELLOW}Load Generator:${NC}"
echo "  The load generator is running and will create traffic every 2 seconds"
echo "  View logs: kubectl logs -f deployment/load-generator -n robot-shop-dev"
echo ""

echo -e "${YELLOW}Instana Monitoring:${NC}"
if [ -f "gitops/overlays/dev/secrets.env" ] && grep -q "your-instana-agent-key-here" gitops/overlays/dev/secrets.env; then
    echo "  ⚠ Instana is not configured. Update secrets.env with your Instana key."
else
    echo "  ✓ Instana is configured. Check your Instana dashboard for metrics."
fi
echo ""

echo -e "${GREEN}Installation completed successfully!${NC}"

# Made with Bob