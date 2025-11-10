#!/bin/bash

# SeamlessAI AWS Deployment Script
set -e

echo "🚀 Starting SeamlessAI deployment to AWS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo -e "${RED}❌ AWS CDK is not installed. Installing...${NC}"
    npm install -g aws-cdk
fi

# Check if logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ Not logged in to AWS. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI and CDK are ready${NC}"

# Get environment (default: dev)
ENVIRONMENT=${1:-dev}
echo -e "${YELLOW}📦 Deploying to environment: ${ENVIRONMENT}${NC}"

# Build Lambda function
echo -e "${YELLOW}🔨 Building Lambda function...${NC}"
cd packages/lambda
npm install
npm run build
cd ../..

# Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
mkdir -p dist/lambda
cp -r packages/lambda/dist/* dist/lambda/
cp -r packages/lambda/node_modules dist/lambda/ 2>/dev/null || echo "No node_modules to copy"

# Build and deploy infrastructure
echo -e "${YELLOW}🏗️ Deploying infrastructure...${NC}"
cd infrastructure
npm install

# Bootstrap CDK (only needed once per account/region)
echo -e "${YELLOW}🔧 Bootstrapping CDK...${NC}"
cdk bootstrap || echo "CDK already bootstrapped"

# Deploy the stack
echo -e "${YELLOW}🚀 Deploying CDK stack...${NC}"
cdk deploy --context environment=${ENVIRONMENT} --require-approval never

# Get stack outputs
echo -e "${YELLOW}📋 Getting deployment outputs...${NC}"
STACK_NAME="SeamlessAI-${ENVIRONMENT}"
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue' --output text)
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)
WEBSITE_BUCKET=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucket`].OutputValue' --output text)
API_KEYS_SECRET_ARN=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query 'Stacks[0].Outputs[?OutputKey==`APIKeysSecretArn`].OutputValue' --output text)

cd ..

# Build frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
cd packages/client

# Create production .env file for frontend
cat > .env.production << EOF
VITE_API_BASE_URL=${CLOUDFRONT_URL}
VITE_USER_POOL_ID=${USER_POOL_ID}
VITE_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
EOF

npm install
npm run build
cd ../..

# Deploy frontend to S3
echo -e "${YELLOW}📤 Deploying frontend to S3...${NC}"
aws s3 sync packages/client/dist/ s3://${WEBSITE_BUCKET}/ --delete

# Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?contains(Comment, '${STACK_NAME}')].Id" --output text)
if [ ! -z "$DISTRIBUTION_ID" ]; then
    echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
    aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths "/*"
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Deployment Summary:${NC}"
echo -e "   🌐 Frontend URL: ${GREEN}${CLOUDFRONT_URL}${NC}"
echo -e "   🔗 API Endpoint: ${GREEN}${API_ENDPOINT}${NC}"
echo -e "   🪣 S3 Bucket: ${GREEN}${WEBSITE_BUCKET}${NC}"
echo -e "   🔐 User Pool ID: ${GREEN}${USER_POOL_ID}${NC}"
echo -e "   🗝️  Client ID: ${GREEN}${USER_POOL_CLIENT_ID}${NC}"
echo ""
echo -e "${YELLOW}🔧 Next Steps:${NC}"
echo -e "   1. Set your OpenAI API key in AWS Secrets Manager:"
echo -e "      ${GREEN}aws secretsmanager update-secret --secret-id ${API_KEYS_SECRET_ARN} --secret-string '{\"OPENAI_API_KEY\":\"your-key-here\",\"JWT_SECRET\":\"auto-generated\",\"OPENAI_MODEL\":\"gpt-4o-mini\",\"OPENAI_MAX_TOKENS\":\"1000\",\"OPENAI_TEMPERATURE\":\"0.7\"}'${NC}"
echo -e "   2. Visit your app at: ${GREEN}${CLOUDFRONT_URL}${NC}"
echo ""
echo -e "${GREEN}✨ Happy coding!${NC}"