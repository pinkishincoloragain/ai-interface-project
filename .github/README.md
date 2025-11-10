# GitHub Actions CI/CD Pipeline

This repository uses GitHub Actions for automated testing, building, and deployment to AWS using Terraform.

## Overview

The CI/CD pipeline has been migrated from Vercel/Supabase to AWS infrastructure using:

- **AWS Lambda** for serverless backend functions
- **Amazon S3** for static website hosting
- **Amazon CloudFront** for CDN
- **Amazon DynamoDB** for data storage
- **Amazon Cognito** for authentication
- **AWS API Gateway** for REST API
- **Terraform** for infrastructure as code

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main`:

- Installs dependencies
- Runs linting
- Performs type checking
- Runs tests

### 2. Staging Deployment (`.github/workflows/staging.yml`)

Deploys to staging environment on pushes to `develop` or `staging` branches:

- Builds Lambda functions and frontend
- Deploys infrastructure using Terraform
- Updates frontend with environment-specific configuration
- Invalidates CloudFront cache

### 3. Production Deployment (`.github/workflows/deploy.yml`)

Deploys to production on pushes to `main` branch:

- Runs full test suite first
- Builds and packages Lambda functions
- Deploys AWS infrastructure using Terraform
- Configures frontend with production settings
- Updates S3 and invalidates CloudFront cache

### 4. Terraform Backend Setup (`.github/workflows/setup-terraform-backend.yml`)

Manual workflow for setting up Terraform state management:

- Creates S3 bucket for Terraform state
- Creates DynamoDB table for state locking
- Run once per environment before first deployment

## Required GitHub Secrets

Set these secrets in your repository settings:

### AWS Credentials

- `AWS_ACCESS_KEY_ID`: AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for deployment
- `AWS_REGION`: AWS region (e.g., `ap-northeast-2`)

### Environment-specific secrets

Set these for both `staging` and `production` environments:

- All AWS credentials above

## Setup Instructions

### 1. Initial Setup

1. Configure AWS credentials in GitHub repository secrets
2. Run the "Setup Terraform Backend" workflow for each environment (dev, staging, prod)
3. Update `terraform/backend.tf` with the created S3 bucket and DynamoDB table names

### 2. First Deployment

1. Push to `develop` branch to trigger staging deployment
2. Push to `main` branch to trigger production deployment
3. Check workflow logs for deployment URLs and configuration

### 3. Configure API Keys

After first deployment, update AWS Secrets Manager with your API keys:

```bash
aws secretsmanager update-secret \
  --secret-id seamlessai-api-keys-prod \
  --secret-string '{"OPENAI_API_KEY":"your-key-here","JWT_SECRET":"auto-generated","OPENAI_MODEL":"gpt-4o-mini","OPENAI_MAX_TOKENS":"1000","OPENAI_TEMPERATURE":"0.7"}'
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   GitHub        │    │   AWS CloudFront│    │   Amazon S3         │
│   Repository    ├───▶│   CDN            ├───▶│   Static Website    │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                                │
                                ▼
                       ┌──────────────────┐    ┌─────────────────────┐
                       │   API Gateway    ├───▶│   AWS Lambda        │
                       │   REST API       │    │   Backend Functions │
                       └──────────────────┘    └─────────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────────┐
                       │   Amazon Cognito │    │   Amazon DynamoDB   │
                       │   Authentication │    │   Database          │
                       └──────────────────┘    └─────────────────────┘
```

## Troubleshooting

### Common Issues

1. **Terraform state conflicts**: Ensure only one deployment runs at a time
2. **AWS permissions**: Verify IAM policies allow all required actions
3. **Build failures**: Check that all dependencies are properly installed
4. **CloudFront cache**: Allow 5-15 minutes for cache invalidation to complete

### Debugging Deployments

1. Check workflow logs in the GitHub Actions tab
2. Verify AWS resources in the AWS Console
3. Test API endpoints using the provided URLs
4. Check CloudWatch logs for Lambda function errors

## Local Development

To test the Terraform configuration locally:

```bash
# Build the applications
pnpm install
cd packages/lambda && npm run build && cd ../..
cd packages/client && npm run build && cd ../..

# Deploy with Terraform
cd terraform
terraform init
terraform plan -var="environment=dev"
terraform apply
```

## Migration Notes

This setup replaces the previous Vercel/Supabase architecture:

- ✅ Removed Vercel deployment steps
- ✅ Removed Supabase Edge Functions deployment
- ✅ Added AWS Lambda build and deployment
- ✅ Added Terraform infrastructure management
- ✅ Added S3/CloudFront frontend hosting
- ✅ Added Cognito authentication setup
