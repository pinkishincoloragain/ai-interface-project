# Terraform configuration block - specifies provider versions and requirements
terraform {
  required_version = ">= 1.0" # Minimum Terraform version needed
  required_providers {
    # AWS provider for creating AWS resources
    aws = {
      source  = "hashicorp/aws" # Official AWS provider
      version = "~> 5.0"        # Use version 5.x (allows minor updates)
    }
    # Archive provider for creating zip files
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

# Configure the AWS provider with the region
provider "aws" {
  region = var.aws_region # Region is set via variable (default: ap-northeast-2)
}

# Local values - computed values used throughout the configuration
locals {
  # Create a naming prefix for all resources (e.g., "seamlessai-dev")
  prefix = "${var.project_name}-${var.environment}"

  # Common tags to apply to all resources for organization and cost tracking
  common_tags = {
    Project     = var.project_name # Project name for identification
    Environment = var.environment  # Environment (dev, staging, prod)
    ManagedBy   = "terraform"      # Indicates these resources are managed by Terraform
  }
}