#!/bin/bash

# Robot Shop Secrets Setup Script
# This script helps configure secrets for the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Robot Shop Secrets Configuration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

SECRETS_FILE="gitops/overlays/dev/secrets.env"

# Check if secrets file already exists
if [ -f "$SECRETS_FILE" ]; then
    echo -e "${YELLOW}Secrets file already exists at: $SECRETS_FILE${NC}"
    read -p "Do you want to reconfigure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing secrets file."
        exit 0
    fi
fi

echo -e "${GREEN}Configuring Instana APM${NC}"
echo "----------------------------"
echo ""

# Instana Agent Key
read -p "Enter your Instana Agent Key (or press Enter to skip): " INSTANA_KEY
if [ -z "$INSTANA_KEY" ]; then
    INSTANA_KEY="your-instana-agent-key-here"
    echo -e "${YELLOW}Warning: Using placeholder Instana key. Monitoring will not work.${NC}"
fi

# Instana Agent Host
read -p "Enter Instana Agent Host [ingress-red-saas.instana.io]: " INSTANA_HOST
INSTANA_HOST=${INSTANA_HOST:-ingress-red-saas.instana.io}

echo ""
echo -e "${GREEN}Configuring JWT Secret${NC}"
echo "----------------------------"
echo ""

# JWT Secret
read -p "Enter JWT Secret (or press Enter to generate): " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    # Generate random JWT secret
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    echo -e "${GREEN}Generated JWT Secret${NC}"
fi

# Create secrets file
echo "Creating secrets file..."
cat > "$SECRETS_FILE" << EOF
# Instana Configuration
INSTANA_AGENT_KEY=${INSTANA_KEY}
INSTANA_AGENT_HOST=${INSTANA_HOST}

# JWT Secret
JWT_SECRET=${JWT_SECRET}
EOF

chmod 600 "$SECRETS_FILE"

echo ""
echo -e "${GREEN}✓ Secrets file created successfully!${NC}"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  • Secrets file: $SECRETS_FILE"
echo "  • This file contains sensitive information"
echo "  • Do NOT commit this file to version control"
echo "  • Make sure it's listed in .gitignore"
echo ""

# Made with Bob