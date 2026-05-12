#!/bin/bash

# Docker Hub Authentication Script
# Handles Docker Hub login to avoid rate limits

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOCKER_CREDS_FILE=".docker-credentials"

echo -e "${BLUE}Docker Hub Authentication${NC}"
echo "----------------------------"
echo ""

# Check if already logged in
if docker info 2>/dev/null | grep -q "Username:"; then
    CURRENT_USER=$(docker info 2>/dev/null | grep "Username:" | awk '{print $2}')
    echo -e "${GREEN}Already logged in to Docker Hub as: ${CURRENT_USER}${NC}"
    read -p "Do you want to use this account? (Y/n): " USE_CURRENT
    USE_CURRENT=${USE_CURRENT:-Y}
    
    if [[ $USE_CURRENT =~ ^[Yy]$ ]]; then
        echo "Using existing Docker Hub session."
        exit 0
    fi
fi

# Check for saved credentials
if [ -f "$DOCKER_CREDS_FILE" ]; then
    echo -e "${YELLOW}Found saved Docker Hub credentials.${NC}"
    read -p "Do you want to use saved credentials? (Y/n): " USE_SAVED
    USE_SAVED=${USE_SAVED:-Y}
    
    if [[ $USE_SAVED =~ ^[Yy]$ ]]; then
        source "$DOCKER_CREDS_FILE"
        
        if [ -n "$DOCKER_USERNAME" ] && [ -n "$DOCKER_PASSWORD" ]; then
            echo "Logging in with saved credentials..."
            echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Successfully logged in to Docker Hub${NC}"
                exit 0
            else
                echo -e "${RED}Failed to login with saved credentials. Please re-enter.${NC}"
                rm -f "$DOCKER_CREDS_FILE"
            fi
        fi
    fi
fi

# Prompt for new credentials
echo ""
echo -e "${YELLOW}Docker Hub Login Required${NC}"
echo "To avoid rate limits, please provide your Docker Hub credentials."
echo "If you don't have an account, create one at: https://hub.docker.com/signup"
echo ""

read -p "Docker Hub Username: " DOCKER_USERNAME

if [ -z "$DOCKER_USERNAME" ]; then
    echo -e "${RED}Error: Username cannot be empty${NC}"
    exit 1
fi

read -s -p "Docker Hub Password or Access Token: " DOCKER_PASSWORD
echo ""

if [ -z "$DOCKER_PASSWORD" ]; then
    echo -e "${RED}Error: Password cannot be empty${NC}"
    exit 1
fi

# Attempt login
echo ""
echo "Logging in to Docker Hub..."
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully logged in to Docker Hub${NC}"
    
    # Ask to save credentials
    echo ""
    read -p "Do you want to save credentials for future use? (y/N): " SAVE_CREDS
    
    if [[ $SAVE_CREDS =~ ^[Yy]$ ]]; then
        cat > "$DOCKER_CREDS_FILE" << EOF
# Docker Hub Credentials
# WARNING: This file contains sensitive information
DOCKER_USERNAME="$DOCKER_USERNAME"
DOCKER_PASSWORD="$DOCKER_PASSWORD"
EOF
        chmod 600 "$DOCKER_CREDS_FILE"
        echo -e "${GREEN}✓ Credentials saved to $DOCKER_CREDS_FILE${NC}"
        echo -e "${YELLOW}Note: This file is excluded from git via .gitignore${NC}"
    fi
else
    echo -e "${RED}Failed to login to Docker Hub${NC}"
    exit 1
fi

# Made with Bob