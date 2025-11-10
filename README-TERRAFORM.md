# SeamlessAI - Terraform Deployment

This project now supports deployment to AWS using Terraform.

## Prerequisites

1. **AWS CLI** - Install and configure with your AWS credentials

    ```bash
    aws configure
    ```

2. **Terraform** - The deploy script will install it automatically on macOS, or install manually:

    - [Terraform Installation Guide](https://www.terraform.io/downloads)

3. **Node.js & pnpm** - For building the application

## Quick Deploy

```bash
# Deploy to dev environment (default)
./deploy-terraform.sh

# Deploy to specific environment
./deploy-terraform.sh prod
```

Or using npm script:

```bash
pnpm deploy
```

## Complete Deployment Steps

After running the initial deployment, follow these steps to fully activate your service:

### 1. Deploy Infrastructure

```bash
cd terraform
terraform apply -auto-approve
```

### 2. Build Frontend

```bash
cd ../packages/client
npm run build
```

### 3. Create Lambda Package

```bash
cd ../terraform
mkdir -p ../dist
zip -r ../dist/lambda.zip ../packages/lambda/src/ ../packages/lambda/package.json
```

### 4. Update Infrastructure with Lambda

```bash
terraform apply -auto-approve
```

### 5. Configure API Keys

Get the secret ARN from terraform output and update with your OpenAI API key:

```bash
# Get the secret ARN
terraform output api_keys_secret_arn

# Update with your actual OpenAI key from .env file
aws secretsmanager update-secret \
  --secret-id "arn:aws:secretsmanager:ap-northeast-2:YOUR-ACCOUNT:secret:seamlessai-dev/api-keys-XXXXX" \
  --secret-string '{"OPENAI_API_KEY":"your-openai-key","JWT_SECRET":"auto-generated","OPENAI_MODEL":"gpt-4o-mini","OPENAI_MAX_TOKENS":"1000","OPENAI_TEMPERATURE":"0.7"}'
```

### 6. Deploy Frontend to S3

Get the bucket name from terraform output and sync frontend files:

```bash
# Get the bucket name
terraform output website_bucket_name

# Deploy frontend files
aws s3 sync ../packages/client/dist/ s3://YOUR-BUCKET-NAME/ --delete
```

### 7. Access Your Application

Your service will be available at:

```bash
# Get the CloudFront URL
terraform output cloudfront_url

# Get the API Gateway URL
terraform output api_gateway_url
```

## Manual Terraform Commands

If you prefer to run Terraform manually:

```bash
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var="environment=dev" -out=tfplan

# Apply deployment
terraform apply tfplan

# Destroy infrastructure (when needed)
terraform destroy -var="environment=dev"
```

## Infrastructure Components

The Terraform configuration creates:

- **Lambda Function**: API backend with Node.js 18 runtime
- **API Gateway**: RESTful API with CORS enabled
- **DynamoDB Tables**: Users, threads, and messages storage
- **Cognito**: User authentication and authorization
- **S3 Bucket**: Frontend hosting
- **CloudFront**: CDN for global content delivery
- **Secrets Manager**: Secure storage for API keys
- **IAM Roles**: Proper permissions for all services

## Configuration

### Environment Variables

Copy `terraform/terraform.tfvars.example` to `terraform/terraform.tfvars` and customize:

```hcl
aws_region   = "ap-northeast-2"
environment  = "dev"
project_name = "seamlessai"
```

### API Keys

Your OpenAI API configuration is read from the `.env` file. After deployment, the secrets are automatically configured
during the complete deployment process above. If you need to update them manually:

```bash
aws secretsmanager update-secret \
  --secret-id "arn:aws:secretsmanager:region:account:secret:seamlessai/dev/api-keys" \
  --secret-string '{"OPENAI_API_KEY":"your-key-here","JWT_SECRET":"auto-generated","OPENAI_MODEL":"gpt-4o-mini","OPENAI_MAX_TOKENS":"1000","OPENAI_TEMPERATURE":"0.7"}'
```

## Deployment Outputs

After successful deployment, you'll get:

- **Frontend URL**: CloudFront distribution URL for your application
- **API Endpoint**: API Gateway URL for backend services
- **S3 Bucket**: Static website hosting bucket name
- **User Pool ID**: Cognito User Pool for authentication
- **Client ID**: Cognito App Client ID
- **API Keys Secret ARN**: AWS Secrets Manager ARN for API configuration

## Using Your Service

Once fully deployed, your SeamlessAI service will be accessible via:

### Web Application

- **URL**: Your CloudFront distribution (from `terraform output cloudfront_url`)
- **Features**:
    - User registration and login
    - Real-time AI chat interface
    - Message history and threading
    - Responsive design for mobile and desktop

### API Endpoints

- **Base URL**: Your API Gateway endpoint (from `terraform output api_gateway_url`)
- **Authentication**: AWS Cognito integration
- **Available Routes**:
    - `/api/auth` - User authentication
    - `/api/chat` - AI chat interactions
    - `/api/stream` - Real-time streaming responses

### Monitoring and Debugging

- **CloudWatch Logs**: `/aws/lambda/seamlessai-dev-api`
- **API Gateway Metrics**: Available in AWS Console
- **DynamoDB Tables**: Monitor user activity and message storage

## Migration from CDK

If you were previously using CDK:

1. The old CDK infrastructure is preserved as `./deploy.sh` and accessible via `pnpm deploy:cdk`
2. Terraform is now the default deployment method via `./deploy-terraform.sh` and `pnpm deploy`
3. You can run both side by side in different environments if needed

## Troubleshooting

### Common Issues

1. **AWS Credentials**: Ensure you're logged in with `aws sts get-caller-identity`
2. **Terraform State**: If deployment fails, check for state lock issues
3. **S3 Bucket Names**: Must be globally unique - the script appends your account ID
4. **Lambda Package**: Ensure the Lambda zip file is built correctly

### Cleanup

To destroy all infrastructure:

```bash
cd terraform
terraform destroy -var="environment=dev"
```

## File Structure

```
terraform/
├── main.tf              # Provider and basic configuration
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── cognito.tf          # User authentication
├── dynamodb.tf         # Database tables
├── lambda.tf           # API function and permissions
├── api_gateway.tf      # REST API configuration
├── s3.tf               # Frontend hosting
├── cloudfront.tf       # CDN configuration
├── secrets.tf          # API keys storage
└── .gitignore          # Terraform-specific ignores
```
