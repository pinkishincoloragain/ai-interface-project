# Separate Lambda function specifically for streaming responses
# This function uses Response Streaming mode for real-time chat

resource "aws_lambda_function" "streaming" {
  filename         = var.lambda_zip_path
  function_name    = "${local.prefix}-streaming-api"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.streamingHandler" # Use streaming handler
  runtime          = "nodejs20.x"
  timeout          = 60 # Increased timeout for streaming
  memory_size      = 1024
  source_code_hash = filebase64sha256(var.lambda_zip_path)

  # Same environment variables as main API
  environment {
    variables = {
      ENVIRONMENT                         = var.environment
      USERS_TABLE                         = aws_dynamodb_table.users.name
      THREADS_TABLE                       = aws_dynamodb_table.threads.name
      MESSAGES_TABLE                      = aws_dynamodb_table.messages.name
      USER_POOL_ID                        = aws_cognito_user_pool.main.id
      USER_POOL_CLIENT_ID                 = aws_cognito_user_pool_client.main.id
      API_KEYS_SECRET_ARN                 = aws_secretsmanager_secret.api_keys.arn
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_cloudwatch_log_group.lambda_logs
  ]

  tags = local.common_tags
}

# CloudWatch log group for streaming Lambda
resource "aws_cloudwatch_log_group" "streaming_lambda_logs" {
  name              = "/aws/lambda/${local.prefix}-streaming-api"
  retention_in_days = 7
  tags              = local.common_tags
}

# Lambda Function URL with streaming enabled
resource "aws_lambda_function_url" "streaming" {
  function_name      = aws_lambda_function.streaming.function_name
  authorization_type = "NONE" # Public access (auth handled in Lambda)

  # Enable response streaming for real-time SSE
  invoke_mode = "RESPONSE_STREAM"

  cors {
    allow_credentials = false
    allow_origins     = ["*"]
    allow_methods     = ["*"] # Allow all methods
    allow_headers     = ["*"] # Allow all headers
    max_age           = 86400
  }
}

# Output the Function URL for use in client configuration
output "lambda_streaming_url" {
  description = "Lambda Function URL for streaming endpoint (real-time)"
  value       = aws_lambda_function_url.streaming.function_url
}
