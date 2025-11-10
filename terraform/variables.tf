# Input variables - values that can be customized when running Terraform
# Variables can be set via terraform.tfvars file, command line, or environment variables

variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "ap-northeast-2" # Seoul region - change this to your preferred region
}

variable "environment" {
  description = "Environment name (dev, staging, prod) - used for resource naming"
  type        = string
  default     = "dev"

  # You could add validation to ensure only valid environment names
  # validation {
  #   condition     = contains(["dev", "staging", "prod"], var.environment)
  #   error_message = "Environment must be dev, staging, or prod."
  # }
}

variable "project_name" {
  description = "Project name - used as prefix for all resources"
  type        = string
  default     = "seamlessai"
}

variable "lambda_zip_path" {
  description = "File path to the Lambda function deployment package (zip file)"
  type        = string
  default     = "../dist/lambda.zip" # Relative to terraform/ directory
}

variable "frontend_build_path" {
  description = "Directory path containing the built frontend files"
  type        = string
  default     = "../packages/client/dist" # Relative to terraform/ directory
}
