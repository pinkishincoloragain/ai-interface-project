#!/bin/bash

# SeamlessAI Terraform Deployment Script
set -e

echo "🚀 Starting SeamlessAI deployment to AWS with Terraform..."

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

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed. Installing...${NC}"
    # Install Terraform (macOS with Homebrew)
    if command -v brew &> /dev/null; then
        brew install terraform
    else
        echo -e "${RED}❌ Please install Terraform manually: https://www.terraform.io/downloads${NC}"
        exit 1
    fi
fi

# Check if logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ Not logged in to AWS. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI and Terraform are ready${NC}"

# Get environment (default: dev)
ENVIRONMENT=${1:-dev}
echo -e "${YELLOW}📦 Deploying to environment: ${ENVIRONMENT}${NC}"

# Build Lambda function
echo -e "${YELLOW}🔨 Building Lambda function...${NC}"
cd packages/lambda
pnpm install
pnpm run build
cd ../..

# Copy deployment package
echo -e "${YELLOW}📦 Copying Lambda deployment package...${NC}"
mkdir -p dist
cp packages/lambda/lambda.zip dist/lambda.zip

# Build frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
cd packages/client
pnpm install
pnpm run build
cd ../..

# Deploy infrastructure with Terraform
echo -e "${YELLOW}🏗️ Deploying infrastructure with Terraform...${NC}"
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
echo -e "${YELLOW}📋 Planning Terraform deployment...${NC}"
terraform plan \
    -var="environment=${ENVIRONMENT}" \
    -var="lambda_zip_path=../dist/lambda.zip" \
    -var="frontend_build_path=../packages/client/dist" \
    -out=tfplan

# Apply deployment
echo -e "${YELLOW}🚀 Applying Terraform deployment...${NC}"
terraform apply tfplan

# Get outputs
echo -e "${YELLOW}📋 Getting deployment outputs...${NC}"
API_ENDPOINT=$(terraform output -raw api_gateway_url)
CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
USER_POOL_ID=$(terraform output -raw user_pool_id)
USER_POOL_CLIENT_ID=$(terraform output -raw user_pool_client_id)
WEBSITE_BUCKET=$(terraform output -raw website_bucket_name)
API_KEYS_SECRET_ARN=$(terraform output -raw api_keys_secret_arn)

cd ..

# Update frontend environment configuration
echo -e "${YELLOW}⚙️ Updating frontend configuration...${NC}"
cd packages/client

# Create production .env file for frontend
cat > .env.production << EOF
VITE_API_BASE_URL=${CLOUDFRONT_URL}
VITE_USER_POOL_ID=${USER_POOL_ID}
VITE_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
EOF

# Rebuild frontend with new config
pnpm run build
cd ../..

# Deploy frontend to S3
echo -e "${YELLOW}📤 Deploying frontend to S3...${NC}"
aws s3 sync packages/client/dist/ s3://${WEBSITE_BUCKET}/ --delete

# Invalidate CloudFront cache
echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?contains(Comment, 'seamlessai-${ENVIRONMENT}') || contains(Origins.Items[0].DomainName, '${WEBSITE_BUCKET}')].Id" \
    --output text)

if [ ! -z "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"
else
    echo -e "${YELLOW}⚠️ Could not find CloudFront distribution for cache invalidation${NC}"
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