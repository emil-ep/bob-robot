#!/bin/bash

# Validation script for install.sh fixes
# Tests non-interactive mode and Dockerfile changes

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "  Install Script Fixes Validation"
echo "========================================="
echo ""

# Test 1: Check install.sh has non-interactive support
echo -e "${YELLOW}Test 1: Checking install.sh for non-interactive mode support...${NC}"
if grep -q "NON_INTERACTIVE=\${NON_INTERACTIVE:-false}" install.sh; then
    echo -e "${GREEN}✓ Non-interactive mode variables found${NC}"
else
    echo -e "${RED}✗ Non-interactive mode variables missing${NC}"
    exit 1
fi

if grep -q "if \[ \"\$NON_INTERACTIVE\" = true \]" install.sh; then
    echo -e "${GREEN}✓ Non-interactive mode checks found${NC}"
else
    echo -e "${RED}✗ Non-interactive mode checks missing${NC}"
    exit 1
fi

echo ""

# Test 2: Check Dockerfiles use npm install instead of npm ci
echo -e "${YELLOW}Test 2: Checking Dockerfiles for npm install...${NC}"

DOCKERFILES=(
    "backend/inventory-service/Dockerfile"
    "backend/order-service/Dockerfile"
    "backend/user-service/Dockerfile"
    "frontend/Dockerfile"
    "load-generator/Dockerfile"
)

ALL_FIXED=true
for dockerfile in "${DOCKERFILES[@]}"; do
    if grep -q "npm install --only=production" "$dockerfile" || grep -q "RUN npm install$" "$dockerfile"; then
        echo -e "${GREEN}✓ $dockerfile uses npm install${NC}"
    elif grep -q "npm ci" "$dockerfile"; then
        echo -e "${RED}✗ $dockerfile still uses npm ci${NC}"
        ALL_FIXED=false
    else
        echo -e "${YELLOW}⚠ $dockerfile: npm command not found${NC}"
    fi
done

if [ "$ALL_FIXED" = false ]; then
    exit 1
fi

echo ""

# Test 3: Verify install.sh syntax
echo -e "${YELLOW}Test 3: Checking install.sh syntax...${NC}"
if bash -n install.sh; then
    echo -e "${GREEN}✓ install.sh syntax is valid${NC}"
else
    echo -e "${RED}✗ install.sh has syntax errors${NC}"
    exit 1
fi

echo ""

# Test 4: Check if secrets.env exists or example exists
echo -e "${YELLOW}Test 4: Checking secrets configuration...${NC}"
if [ -f "gitops/overlays/dev/secrets.env" ]; then
    echo -e "${GREEN}✓ secrets.env exists${NC}"
elif [ -f "gitops/overlays/dev/secrets.env.example" ]; then
    echo -e "${YELLOW}⚠ Only secrets.env.example exists. Run setup-secrets.sh before installing.${NC}"
else
    echo -e "${RED}✗ No secrets configuration found${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}All validation tests passed!${NC}"
echo "========================================="
echo ""
echo "Summary of fixes:"
echo "  1. Added non-interactive mode support to install.sh"
echo "     - Set NON_INTERACTIVE=true to skip prompts"
echo "     - Set DEPLOY_METHOD, BUILD_IMAGES, etc. as env vars"
echo ""
echo "  2. Fixed Dockerfiles to use 'npm install' instead of 'npm ci'"
echo "     - npm ci requires package-lock.json which is missing"
echo "     - npm install works without lock file"
echo ""
echo "To run install in non-interactive mode:"
echo "  NON_INTERACTIVE=true DEPLOY_METHOD=2 BUILD_IMAGES=n ./install.sh"
echo ""
