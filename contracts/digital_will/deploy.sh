#!/bin/bash

# Digital Will v2 - Testnet Deployment Script
# Prerequisites:
# 1. Leo CLI installed (v3.4.0+)
# 2. Aleo account with testnet ALEO for deployment fees (~1 ALEO)
# 3. .env file with PRIVATE_KEY set

set -e

echo "=== Digital Will v2 Testnet Deployment ==="
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found!"
    echo "Please create a .env file with your PRIVATE_KEY:"
    echo ""
    echo "  cp .env.example .env"
    echo "  # Edit .env and add your Aleo private key"
    echo ""
    exit 1
fi

# Load environment variables
source .env

if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" = "your_aleo_private_key_here" ]; then
    echo "ERROR: PRIVATE_KEY not set in .env file!"
    echo "Please add your Aleo testnet private key to .env"
    exit 1
fi

echo "Step 1: Building contract..."
leo build --network testnet

echo ""
echo "Step 2: Deploying to testnet..."
echo "This may take a few minutes..."
echo ""

# Deploy with the private key from environment
leo deploy --network testnet --private-key "$PRIVATE_KEY"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. Save the deployment transaction ID above"
echo "2. Verify on Aleo Explorer: https://explorer.aleo.org/"
echo "3. Start the frontend: cd frontend && npm run dev"
echo "4. Switch to 'Testnet' mode in the dashboard"
echo ""
