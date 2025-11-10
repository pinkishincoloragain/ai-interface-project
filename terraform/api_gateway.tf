# API Gateway - provides HTTP endpoints for your Lambda function
# This creates a REST API that clients can call over HTTPS

resource "aws_api_gateway_rest_api" "main" {
  name        = "${local.prefix}-api"    # e.g., "seamlessai-dev-api"
  description = "SeamlessAI API Gateway" # Human-readable description

  # Regional endpoint is cheaper and faster for users in the same region
  endpoint_configuration {
    types = ["REGIONAL"] # Alternative: "EDGE" for global CloudFront distribution
  }

  tags = local.common_tags
}

# Proxy resource - catches ALL paths under the API
# {proxy+} means "match any path with one or more segments"
# Example: /api/users, /api/threads/123, /api/anything/else
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id # Root of the API
  path_part   = "{proxy+}"                                     # Wildcard that matches any path
}

# Method for the proxy resource - handles all HTTP methods
# ANY means GET, POST, PUT, DELETE, etc. are all allowed
resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"  # Accept all HTTP methods
  authorization = "NONE" # No API Gateway level auth (handled in Lambda)
}

# Integration - connects the API Gateway to your Lambda function
resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_method.proxy.resource_id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"                             # Lambda always uses POST for invocation
  type                    = "AWS_PROXY"                        # Proxy integration - passes full request to Lambda
  uri                     = aws_lambda_function.api.invoke_arn # Lambda function to call
}

# Method for root path ("/") - handles requests to the API root
# This is separate from the proxy because {proxy+} requires at least one path segment
resource "aws_api_gateway_method" "proxy_root" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_rest_api.main.root_resource_id # Root path "/"
  http_method   = "ANY"                                          # Accept all HTTP methods
  authorization = "NONE"                                         # No API Gateway level auth
}

# Integration for root path - also connects to the same Lambda function
resource "aws_api_gateway_integration" "lambda_root" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_method.proxy_root.resource_id
  http_method = aws_api_gateway_method.proxy_root.http_method

  integration_http_method = "POST"                             # Lambda always uses POST
  type                    = "AWS_PROXY"                        # Proxy integration
  uri                     = aws_lambda_function.api.invoke_arn # Same Lambda function
}

# Deployment - actually makes the API live and accessible
# API Gateway requires explicit deployment to activate changes
resource "aws_api_gateway_deployment" "main" {
  # Wait for all integrations to be created first
  depends_on = [
    aws_api_gateway_integration.lambda,      # Proxy integration
    aws_api_gateway_integration.lambda_root, # Root integration
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id

  # Automatically redeploy when configuration changes
  # This hash changes when any of these resources change
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.lambda.id,
      aws_api_gateway_method.proxy_root.id,
      aws_api_gateway_integration.lambda_root.id,
    ]))
  }

  # Create new deployment before destroying old one (zero downtime)
  lifecycle {
    create_before_destroy = true
  }
}

# Stage - manages the deployment stage (dev, prod, etc.)
# This replaces the deprecated stage_name argument in deployment
resource "aws_api_gateway_stage" "main" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  deployment_id = aws_api_gateway_deployment.main.id
  stage_name    = var.environment # Stage name (dev, prod, etc.)

  tags = local.common_tags
}

# Lambda permission - allows API Gateway to invoke your Lambda function
# Without this, API Gateway gets "permission denied" when calling Lambda
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"        # Unique ID for this permission
  action        = "lambda:InvokeFunction"               # Permission to invoke the function
  function_name = aws_lambda_function.api.function_name # Which function
  principal     = "apigateway.amazonaws.com"            # Who can invoke it (API Gateway service)

  # Source ARN pattern: allows any stage and any path
  # Format: arn:aws:execute-api:region:account:api-id/stage/method/path
  source_arn = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# CORS Gateway Response for 4XX errors (client errors)
# When API Gateway returns 4XX errors, we need to add CORS headers
# so the browser doesn't block the error response
resource "aws_api_gateway_gateway_response" "cors" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_4XX" # Applies to all 4XX errors (400, 401, 404, etc.)

  # Error response body template
  response_templates = {
    "application/json" = jsonencode({
      message = "$context.error.messageString" # Include the actual error message
    })
  }

  # CORS headers for error responses
  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"      = "'*'"                                                                                     # Allow any origin
    "gatewayresponse.header.Access-Control-Allow-Headers"     = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'" # Allowed headers
    "gatewayresponse.header.Access-Control-Allow-Methods"     = "'OPTIONS,DELETE,GET,HEAD,PATCH,POST,PUT'"                                                # Allowed HTTP methods
    "gatewayresponse.header.Access-Control-Allow-Credentials" = "'false'"                                                                                 # Don't include cookies/auth
  }
}

# CORS Gateway Response for 5XX errors (server errors)
# When API Gateway or Lambda returns 5XX errors, add CORS headers
resource "aws_api_gateway_gateway_response" "cors_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_5XX" # Applies to all 5XX errors (500, 502, 503, etc.)

  # Error response body template
  response_templates = {
    "application/json" = jsonencode({
      message = "$context.error.messageString" # Include the actual error message
    })
  }

  # Same CORS headers as 4XX responses
  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"      = "'*'" # Allow any origin
    "gatewayresponse.header.Access-Control-Allow-Headers"     = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'"
    "gatewayresponse.header.Access-Control-Allow-Methods"     = "'OPTIONS,DELETE,GET,HEAD,PATCH,POST,PUT'"
    "gatewayresponse.header.Access-Control-Allow-Credentials" = "'false'"
  }
}