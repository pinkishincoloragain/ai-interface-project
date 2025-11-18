# Output values - these are displayed after Terraform runs and can be used by other configurations
# Outputs are useful for getting important information like URLs and IDs

output "api_gateway_url" {
  description = "API Gateway endpoint URL - use this for backend API calls"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "cloudfront_url" {
  description = "CloudFront distribution URL - this is your main application URL"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "user_pool_id" {
  description = "Cognito User Pool ID - needed for frontend authentication configuration"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  description = "Cognito User Pool Client ID - needed for frontend authentication configuration"
  value       = aws_cognito_user_pool_client.main.id
}

output "website_bucket_name" {
  description = "S3 bucket name for frontend hosting - used for deploying static files"
  value       = aws_s3_bucket.website.id
}

output "api_keys_secret_arn" {
  description = "Secrets Manager ARN - use this to update API keys (like OpenAI API key)"
  value       = aws_secretsmanager_secret.api_keys.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID - needed for cache invalidation"
  value       = aws_cloudfront_distribution.main.id
}