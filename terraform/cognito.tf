# AWS Cognito - handles user authentication and authorization
# This provides user registration, login, password reset, and JWT tokens

# Create a user pool to manage users
resource "aws_cognito_user_pool" "main" {
  name = "${local.prefix}-users" # e.g., "seamlessai-dev-users"

  # Automatically verify email addresses when users sign up
  auto_verified_attributes = ["email"]
  # Allow users to sign in with their email instead of username
  alias_attributes = ["email"]

  # Set password requirements for security
  password_policy {
    minimum_length    = 8     # At least 8 characters
    require_lowercase = true  # Must include lowercase letters
    require_numbers   = true  # Must include numbers
    require_symbols   = false # Symbols not required (easier for users)
    require_uppercase = true  # Must include uppercase letters
  }

  # How users can recover their account if they forget password
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email" # Send reset link to verified email
      priority = 1                # Primary recovery method
    }
  }

  # Define user attributes (what information we store about users)
  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true # Email is required for all users
    mutable             = true # Users can change their email

    string_attribute_constraints {
      max_length = "2048"
      min_length = "0"
    }
  }

  tags = local.common_tags
}

# Create an app client - this is what your frontend app uses to authenticate
resource "aws_cognito_user_pool_client" "main" {
  name         = "${local.prefix}-client" # e.g., "seamlessai-dev-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false # Public clients (like web apps) don't need secrets

  # Authentication flows - different ways users can sign in
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",            # Secure Remote Password (recommended)
    "ALLOW_USER_PASSWORD_AUTH",       # Direct username/password (for testing)
    "ALLOW_ADMIN_USER_PASSWORD_AUTH", # Admin API for server-side auth
    "ALLOW_REFRESH_TOKEN_AUTH"        # Allow refreshing expired tokens
  ]

  # Only use Cognito for authentication (not external providers like Google/Facebook)
  supported_identity_providers = ["COGNITO"]

  # URLs that Cognito can redirect to after authentication
  # Add your production URLs here when you deploy
  callback_urls = [
    "http://localhost:3000", # Local development
    "https://localhost:3000" # Local development with HTTPS
  ]

  # OAuth settings for web application flow
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]                       # Authorization code flow
  allowed_oauth_scopes                 = ["email", "openid", "profile"] # What info the app can access
}