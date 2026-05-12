#!/bin/bash

# Robot Shop Application Uninstallation Script
# This script removes all application resources

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Robot Shop Application Uninstaller${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace robot-shop-dev &> /dev/null; then
    echo -e "${YELLOW}Application is not installed (namespace not found)${NC}"
    exit 0
fi

# Confirm uninstallation
echo -e "${YELLOW}WARNING: This will delete all application resources!${NC}"
echo ""
echo "The following will be removed:"
echo "  • All pods, services, and deployments in robot-shop-dev namespace"
echo "  • All secrets and configmaps"
echo "  • Database data (if using local storage)"
echo "  • ArgoCD application (if exists)"
echo ""
read -p "Are you sure you want to continue? (yes/NO): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Uninstallation cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}Starting uninstallation...${NC}"
echo ""

# Check if ArgoCD application exists
if kubectl get application robot-shop-dev -n argocd &> /dev/null 2>&1; then
    echo "Removing ArgoCD application..."
    kubectl delete application robot-shop-dev -n argocd --wait=false 2>/dev/null || true
    echo -e "${GREEN}✓ ArgoCD application removed${NC}"
    echo ""
fi

# Delete all resources using kustomize
echo "Removing application resources..."
kubectl delete -k gitops/overlays/dev --wait=false 2>/dev/null || true

# Force delete namespace if it still exists
echo "Removing namespace..."
kubectl delete namespace robot-shop-dev --wait=false 2>/dev/null || true

# Wait a bit for resources to be deleted
echo ""
echo "Waiting for resources to be cleaned up..."
sleep 5

# Check if namespace is gone
for i in {1..30}; do
    if ! kubectl get namespace robot-shop-dev &> /dev/null; then
        echo -e "${GREEN}✓ Namespace removed${NC}"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

# If namespace still exists, force remove finalizers
if kubectl get namespace robot-shop-dev &> /dev/null 2>&1; then
    echo -e "${YELLOW}Forcing namespace deletion...${NC}"
    kubectl get namespace robot-shop-dev -o json | \
        jq '.spec.finalizers = []' | \
        kubectl replace --raw "/api/v1/namespaces/robot-shop-dev/finalize" -f - 2>/dev/null || true
    sleep 2
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Uninstallation Complete! ✓${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${GREEN}All application resources have been removed.${NC}"
echo ""
echo -e "${YELLOW}Note:${NC} Secret files in gitops/overlays/dev/ were NOT deleted."
echo "To remove them manually:"
echo "  rm gitops/overlays/dev/secrets.env"
echo ""
echo "Docker images were NOT removed. To remove them:"
echo "  docker rmi robot-shop/inventory-service:latest"
echo "  docker rmi robot-shop/order-service:latest"
echo "  docker rmi robot-shop/user-service:latest"
echo "  docker rmi robot-shop/frontend:latest"
echo "  docker rmi robot-shop/load-generator:latest"
echo ""
echo "To reinstall the application, run:"
echo "  ./install.sh"
echo ""

# Made with Bob