# AWS Secrets Manager - securely stores sensitive configuration like API keys
# This is much safer than putting secrets in environment variables or code

# Create a secret to store API keys and configuration
resource "aws_secretsmanager_secret" "api_keys" {
  name                    = "${local.prefix}/api-keys" # e.g., "seamlessai-dev/api-keys"
  description             = "API keys and configuration for SeamlessAI application"
  recovery_window_in_days = 0 # Allow immediate deletion (be careful in production!)

  tags = local.common_tags
}

# Create the initial version of the secret with default values
resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id

  # Store secrets as JSON - this makes it easy to retrieve individual keys
  secret_string = jsonencode({
    OPENAI_API_KEY     = ""                                # You'll need to update this manually after deployment
    JWT_SECRET         = random_password.jwt_secret.result # Auto-generated secure password
    OPENAI_MODEL       = "gpt-4o-mini"                     # Default OpenAI model to use
    OPENAI_MAX_TOKENS  = "1000"                            # Token limit for AI responses
    OPENAI_TEMPERATURE = "0.7"                             # AI response creativity (0.0 = deterministic, 1.0 = creative)
  })

  # Ignore changes to secret_string after initial creation
  # This prevents Terraform from overwriting manual updates
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Generate a secure random password for JWT token signing
resource "random_password" "jwt_secret" {
  length  = 32   # 32 character password
  special = true # Include special characters for extra security
}