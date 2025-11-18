#!/bin/bash

# SeamlessAI Terraform Deployment Script
# Simple wrapper around Makefile

set -e

echo "🚀 Starting SeamlessAI deployment to AWS with Terraform..."

# Get environment (default: dev)
ENVIRONMENT=${1:-dev}

# Call the Makefile with the appropriate target
make deploy-all ENV=${ENVIRONMENT}