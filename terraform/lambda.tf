# IAM role that the Lambda function will assume (like a service account)
resource "aws_iam_role" "lambda_role" {
  name = "${local.prefix}-lambda-role" # e.g., "seamlessai-dev-lambda-role"

  # Trust policy - allows AWS Lambda service to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole" # Permission to assume this role
        Effect = "Allow"          # Allow this action
        Principal = {
          Service = "lambda.amazonaws.com" # Only Lambda service can use this role
        }
      }
    ]
  })

  tags = local.common_tags
}

# Attach AWS managed policy for basic Lambda execution
# This provides permissions to write logs to CloudWatch
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

# Custom IAM policy with specific permissions for our application
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${local.prefix}-lambda-policy"
  role = aws_iam_role.lambda_role.id

  # IAM policy document defining what the Lambda function can do
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # DynamoDB permissions - read/write access to our tables
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem", # Read single item
          "dynamodb:PutItem", # Create new item
          "dynamodb:UpdateItem", # Update existing item
          "dynamodb:DeleteItem", # Delete item
          "dynamodb:Query", # Query with key conditions
          "dynamodb:Scan"        # Scan entire table (use sparingly)
        ]
        Resource = [
          # Main tables
          aws_dynamodb_table.users.arn,
          aws_dynamodb_table.threads.arn,
          aws_dynamodb_table.messages.arn,
          # Global Secondary Indexes (GSIs)
          "${aws_dynamodb_table.users.arn}/index/*",
          "${aws_dynamodb_table.threads.arn}/index/*",
          "${aws_dynamodb_table.messages.arn}/index/*"
        ]
      },
      {
        # Secrets Manager permissions - read API keys
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue" # Read secret values
        ]
        Resource = aws_secretsmanager_secret.api_keys.arn
      },
      {
        # Cognito permissions - manage users and authentication
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminInitiateAuth", # Start authentication flow
          "cognito-idp:AdminCreateUser", # Create new users
          "cognito-idp:AdminSetUserPassword", # Set user passwords
          "cognito-idp:AdminGetUser", # Get user details
          "cognito-idp:AdminUpdateUserAttributes", # Update user info
          "cognito-idp:ListUsers"                  # List all users
        ]
        Resource = aws_cognito_user_pool.main.arn
      },
      {
        # AWS Bedrock permissions - alternative AI service (optional)
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel", # Call AI models
          "bedrock:InvokeModelWithResponseStream" # Stream AI responses
        ]
        Resource = "*" # All Bedrock models
      }
    ]
  })
}

# CloudWatch log group for Lambda function logs
# This is where your console.log() output and errors will appear
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name = "/aws/lambda/${local.prefix}-api" # Log group name
  retention_in_days = 7                                 # Keep logs for 7 days (saves money vs. indefinite retention)
  tags = local.common_tags
}

# The actual Lambda function that runs your API code
resource "aws_lambda_function" "api" {
  filename = var.lambda_zip_path          # Path to your deployment zip file
  function_name = "${local.prefix}-api"        # e.g., "seamlessai-dev-api"
  role = aws_iam_role.lambda_role.arn # IAM role with permissions
  handler = "index.handler"              # Entry point: index.js, export handler function
  runtime = "nodejs20.x"                 # Node.js version
  timeout = 30                           # Max execution time (seconds)
  memory_size = 1024                         # Memory allocation (MB) - affects CPU power
  source_code_hash = filebase64sha256(var.lambda_zip_path) # Hash to detect code changes

  # Environment variables available to your Lambda function
  environment {
    variables = {
      ENVIRONMENT = var.environment                        # "dev", "prod", etc.
      USERS_TABLE = aws_dynamodb_table.users.name          # Users table name
      THREADS_TABLE = aws_dynamodb_table.threads.name        # Threads table name
      MESSAGES_TABLE = aws_dynamodb_table.messages.name       # Messages table name
      USER_POOL_ID = aws_cognito_user_pool.main.id          # Cognito User Pool ID
      USER_POOL_CLIENT_ID = aws_cognito_user_pool_client.main.id   # Cognito Client ID
      API_KEYS_SECRET_ARN = aws_secretsmanager_secret.api_keys.arn # Secrets Manager ARN
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
      # Reuse connections for better performance
    }
  }

  # Wait for these resources to be created first
  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic, # IAM permissions
    aws_cloudwatch_log_group.lambda_logs         # Log group
  ]

  tags = local.common_tags
}
