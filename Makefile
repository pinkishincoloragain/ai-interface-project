SHELL := /bin/bash

# default env
ENV ?= dev

# paths
LAMBDA_DIR := packages/lambda
CLIENT_DIR := packages/client
DIST_DIR := dist
TF_DIR := terraform

# colors
RED    := \033[0;31m
GREEN  := \033[0;32m
YELLOW := \033[1;33m
NC     := \033[0m

.PHONY: \
	check-tools check-aws \
	lambda-build copy-lambda-zip \
	frontend-build frontend-env \
	tf-init tf-plan tf-apply tf-output \
	client-deploy cf-invalidate \
	deploy-all deploy-client deploy-server infra \
	summary

# --------------------------
# Checks
# --------------------------

check-tools:
	@echo -e "$(YELLOW)🔍 Checking tools...$(NC)"
	@if ! command -v aws &> /dev/null; then \
		echo -e "$(RED)❌ AWS CLI is not installed. Please install it first.$(NC)"; \
		exit 1; \
	fi
	@if ! command -v terraform &> /dev/null; then \
		echo -e "$(RED)❌ Terraform is not installed. Please install it manually (or via brew).$(NC)"; \
		exit 1; \
	fi
	@echo -e "$(GREEN)✅ AWS CLI and Terraform are installed.$(NC)"

check-aws:
	@echo -e "$(YELLOW)🔑 Checking AWS credentials...$(NC)"
	@if ! aws sts get-caller-identity &> /dev/null; then \
		echo -e "$(RED)❌ Not logged in to AWS. Please run 'aws configure' first.$(NC)"; \
		exit 1; \
	fi
	@echo -e "$(GREEN)✅ AWS credentials OK.$(NC)"

# --------------------------
# Lambda (server)
# --------------------------

lambda-build:
	@echo -e "$(YELLOW)🔨 Building Lambda function...$(NC)"
	cd $(LAMBDA_DIR) && pnpm install && pnpm run build

copy-lambda-zip:
	@echo -e "$(YELLOW)📦 Copying Lambda deployment package...$(NC)"
	mkdir -p $(DIST_DIR)
	cp $(LAMBDA_DIR)/lambda.zip $(DIST_DIR)/lambda.zip

# --------------------------
# Frontend (client)
# --------------------------

frontend-build:
	@echo -e "$(YELLOW)🔨 Building frontend...$(NC)"
	cd $(CLIENT_DIR) && pnpm install && pnpm run build

frontend-env:
	@echo -e "$(YELLOW)⚙️ Updating frontend .env.production from Terraform outputs...$(NC)"
	@cd $(TF_DIR) && \
	API_ENDPOINT=$$(terraform output -raw api_gateway_url) && \
	STREAMING_URL=$$(terraform output -raw lambda_streaming_url) && \
	CLOUDFRONT_URL=$$(terraform output -raw cloudfront_url) && \
	USER_POOL_ID=$$(terraform output -raw user_pool_id) && \
	USER_POOL_CLIENT_ID=$$(terraform output -raw user_pool_client_id) && \
	cd .. && \
	printf "VITE_API_BASE_URL=%s\nVITE_STREAMING_URL=%s\nVITE_USER_POOL_ID=%s\nVITE_USER_POOL_CLIENT_ID=%s\n" \
		"$$API_ENDPOINT" "$${STREAMING_URL%/}" "$$USER_POOL_ID" "$$USER_POOL_CLIENT_ID" > $(CLIENT_DIR)/.env.production

client-deploy:
	@echo -e "$(YELLOW)📤 Deploying frontend to S3...$(NC)"
	@cd $(TF_DIR); \
	WEBSITE_BUCKET=$$(terraform output -raw website_bucket_name); \
	CLOUDFRONT_ID=$$(terraform output -raw cloudfront_distribution_id); \
	cd ..; \
	aws s3 sync $(CLIENT_DIR)/dist/ s3://$$WEBSITE_BUCKET/ --delete; \
	if [ -n "$$CLOUDFRONT_ID" ] && [ "$$CLOUDFRONT_ID" != "None" ]; then \
		echo -e "$(YELLOW)🔄 Invalidating CloudFront cache...$(NC)"; \
		aws cloudfront create-invalidation --distribution-id $$CLOUDFRONT_ID --paths "/*"; \
	else \
		echo -e "$(YELLOW)⚠️ No CloudFront distribution found for invalidation.$(NC)"; \
	fi

# --------------------------
# Terraform (infra)
# --------------------------

tf-init:
	@echo -e "$(YELLOW)🏗️ Terraform init...$(NC)"
	cd $(TF_DIR) && terraform init

tf-plan:
	@echo -e "$(YELLOW)📋 Terraform plan (env=$(ENV))...$(NC)"
	cd $(TF_DIR) && terraform plan \
		-var="environment=$(ENV)" \
		-var="lambda_zip_path=../$(DIST_DIR)/lambda.zip" \
		-var="frontend_build_path=../$(CLIENT_DIR)/dist" \
		-out=tfplan

tf-apply:
	@echo -e "$(YELLOW)🚀 Terraform apply...$(NC)"
	cd $(TF_DIR) && terraform apply tfplan

tf-output:
	@echo -e "$(YELLOW)📋 Terraform outputs...$(NC)"
	@cd $(TF_DIR) && terraform output

# --------------------------
# Summary
# --------------------------

summary:
	@echo ""
	@echo -e "$(YELLOW)📋 Deployment Summary:$(NC)"
	@cd $(TF_DIR); \
	CLOUDFRONT_URL=$$(terraform output -raw cloudfront_url 2>/dev/null || echo "N/A"); \
	API_ENDPOINT=$$(terraform output -raw api_gateway_url 2>/dev/null || echo "N/A"); \
	STREAMING_URL=$$(terraform output -raw lambda_streaming_url 2>/dev/null || echo "N/A"); \
	WEBSITE_BUCKET=$$(terraform output -raw website_bucket_name 2>/dev/null || echo "N/A"); \
	USER_POOL_ID=$$(terraform output -raw user_pool_id 2>/dev/null || echo "N/A"); \
	USER_POOL_CLIENT_ID=$$(terraform output -raw user_pool_client_id 2>/dev/null || echo "N/A"); \
	API_KEYS_SECRET_ARN=$$(terraform output -raw api_keys_secret_arn 2>/dev/null || echo "N/A"); \
	echo -e "   🌐 Frontend URL: $(GREEN)$$CLOUDFRONT_URL$(NC)"; \
	echo -e "   🔗 API Endpoint: $(GREEN)$$API_ENDPOINT$(NC)"; \
	echo -e "   ⚡ Streaming URL: $(GREEN)$$STREAMING_URL$(NC)"; \
	echo -e "   🪣 S3 Bucket: $(GREEN)$$WEBSITE_BUCKET$(NC)"; \
	echo -e "   🔐 User Pool ID: $(GREEN)$$USER_POOL_ID$(NC)"; \
	echo -e "   🗝️  Client ID: $(GREEN)$$USER_POOL_CLIENT_ID$(NC)"; \
	echo ""; \
	echo -e "$(YELLOW)🔧 Next Steps:$(NC)"; \
	echo -e "   1. Set your OpenAI API key in AWS Secrets Manager:"; \
	echo -e "      $(GREEN)aws secretsmanager update-secret --secret-id $$API_KEYS_SECRET_ARN --secret-string '{\"OPENAI_API_KEY\":\"your-key-here\",\"JWT_SECRET\":\"auto-generated\",\"OPENAI_MODEL\":\"gpt-4o-mini\",\"OPENAI_MAX_TOKENS\":\"1000\",\"OPENAI_TEMPERATURE\":\"0.7\"}'$(NC)"; \
	echo -e "   2. Visit your app at: $(GREEN)$$CLOUDFRONT_URL$(NC)"; \
	echo ""; \
	echo -e "$(GREEN)✨ Happy coding!$(NC)"

# --------------------------
# High-level commands
# --------------------------

deploy-all: check-tools check-aws lambda-build copy-lambda-zip frontend-build tf-init tf-plan tf-apply tf-output frontend-env frontend-build client-deploy summary
	@echo -e "$(GREEN)🎉 Full deployment complete (env=$(ENV))!$(NC)"

# only server (lambda + infra), e.g. API change or DB only
deploy-server: check-tools check-aws lambda-build copy-lambda-zip tf-init tf-plan tf-apply tf-output summary
	@echo -e "$(GREEN)🟢 Server / infra deployment complete (env=$(ENV))!$(NC)"

# only infra (DB, IAM, etc) – no lambda rebuild
infra: check-tools check-aws tf-init tf-plan tf-apply tf-output summary
	@echo -e "$(GREEN)🟢 Infrastructure-only deployment complete (env=$(ENV))!$(NC)"

# only client (reuse existing Terraform outputs)
deploy-client: check-tools check-aws frontend-env frontend-build client-deploy summary
	@echo -e "$(GREEN)🟢 Client-only deployment complete (env=$(ENV))!$(NC)"
