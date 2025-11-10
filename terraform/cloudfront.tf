# CloudFront - Content Delivery Network (CDN) for global fast access
# This distributes your website globally and provides HTTPS

# Origin Access Control - secures S3 bucket so only CloudFront can access it
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${local.prefix}-website-oac" # Unique name
  description                       = "CloudFront access to S3"     # Human-readable description
  origin_access_control_origin_type = "s3"                          # Origin is S3 bucket
  signing_behavior                  = "always"                      # Always sign requests
  signing_protocol                  = "sigv4"                       # Use AWS Signature Version 4
}

# CloudFront Distribution - the main CDN configuration
resource "aws_cloudfront_distribution" "main" {
  wait_for_deployment = false
  # Origin 1: S3 bucket for static website files (HTML, CSS, JS, images)
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name # S3 bucket domain
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id   # Use OAC for security
    origin_id                = "S3-${aws_s3_bucket.website.bucket}"              # Unique identifier
  }

  # Origin 2: API Gateway for backend API calls
  origin {
    domain_name = "${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com" # API Gateway URL
    origin_id   = "ApiGateway"                                                                      # Unique identifier
    origin_path = "/${var.environment}"                                                             # Stage path (e.g., "/dev")

    # Custom origin configuration for API Gateway
    custom_origin_config {
      http_port              = 80           # HTTP port (not used since we force HTTPS)
      https_port             = 443          # HTTPS port
      origin_protocol_policy = "https-only" # Only use HTTPS to connect to API Gateway
      origin_ssl_protocols   = ["TLSv1.2"]  # Minimum TLS version
    }
  }

  enabled             = true         # Enable the distribution
  is_ipv6_enabled     = true         # Enable IPv6 support
  default_root_object = "index.html" # Default file to serve for "/" requests

  # Default cache behavior - handles requests to static files (S3)
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"] # Allow all HTTP methods
    cached_methods         = ["GET", "HEAD"]                                              # Only cache GET and HEAD
    target_origin_id       = "S3-${aws_s3_bucket.website.bucket}"                         # Route to S3 bucket
    viewer_protocol_policy = "redirect-to-https"                                          # Force HTTPS

    # Caching configuration for static files
    forwarded_values {
      query_string = false # Don't forward query parameters to S3
      cookies {
        forward = "none" # Don't forward cookies to S3
      }
    }

    min_ttl     = 0     # Minimum cache time (0 = respect origin headers)
    default_ttl = 3600  # Default cache time (1 hour)
    max_ttl     = 86400 # Maximum cache time (24 hours)
  }

  # Special cache behavior for API calls - routes to API Gateway
  ordered_cache_behavior {
    path_pattern     = "/api/*"                                                     # Match all /api/* requests
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"] # Allow all HTTP methods
    cached_methods   = ["GET", "HEAD", "OPTIONS"]                                   # Cache safe methods
    target_origin_id = "ApiGateway"                                                 # Route to API Gateway

    # API requests need different caching than static files
    forwarded_values {
      query_string = true                              # Forward query parameters to API
      headers      = ["Authorization", "Content-Type"] # Forward important headers
      cookies {
        forward = "none" # Don't forward cookies (using Authorization header instead)
      }
    }

    min_ttl                = 0            # No minimum cache (respect API responses)
    default_ttl            = 0            # Don't cache by default
    max_ttl                = 0            # No maximum cache
    compress               = true         # Enable gzip compression
    viewer_protocol_policy = "https-only" # Force HTTPS for API calls
  }

  # Custom error responses for Single Page Application (SPA) routing
  # When React Router handles routing, we need to serve index.html for 404s
  custom_error_response {
    error_code         = 404           # When S3 returns 404 (file not found)
    response_code      = 200           # Return 200 OK instead
    response_page_path = "/index.html" # Serve index.html (React Router takes over)
  }

  custom_error_response {
    error_code         = 403           # When S3 returns 403 (forbidden)
    response_code      = 200           # Return 200 OK instead
    response_page_path = "/index.html" # Serve index.html
  }

  # Geographic restrictions (none in this case)
  restrictions {
    geo_restriction {
      restriction_type = "none" # Allow access from all countries
    }
  }

  # SSL/TLS certificate configuration
  viewer_certificate {
    cloudfront_default_certificate = true # Use CloudFront's default certificate (*.cloudfront.net)
    # For custom domain, you'd use:
    # acm_certificate_arn = aws_acm_certificate.cert.arn
    # ssl_support_method = "sni-only"
  }

  tags = local.common_tags
}