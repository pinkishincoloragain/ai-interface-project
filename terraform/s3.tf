# Get current AWS account ID - needed for unique S3 bucket naming
data "aws_caller_identity" "current" {}

# S3 bucket for hosting the frontend static files (HTML, CSS, JS)
# S3 bucket names must be globally unique across ALL AWS accounts
resource "aws_s3_bucket" "website" {
  bucket = "${local.prefix}-frontend-${data.aws_caller_identity.current.account_id}" # e.g., "seamlessai-dev-frontend-123456789012"
  tags   = local.common_tags
}

# Configure S3 bucket as a static website
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  # Default document to serve when someone visits the root
  index_document {
    suffix = "index.html" # Serve index.html for "/" requests
  }

  # Document to serve for 404 errors (important for SPAs like React)
  error_document {
    key = "index.html" # Serve index.html for 404s (React Router handles routing)
  }
}

# Configure public access settings for the website bucket
# By default, AWS blocks all public access - we need to allow it for websites
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  # Allow public access (required for website hosting)
  block_public_acls       = false # Allow public ACLs
  block_public_policy     = false # Allow public bucket policies
  ignore_public_acls      = false # Don't ignore public ACLs
  restrict_public_buckets = false # Allow public bucket access
}

# IAM policy document for public read access to website files
# This policy allows anyone on the internet to read files in the bucket
data "aws_iam_policy_document" "website_policy" {
  statement {
    principals {
      type        = "*"   # Any principal (anyone on the internet)
      identifiers = ["*"] # Any specific identifier
    }

    actions = [
      "s3:GetObject", # Permission to read/download objects
    ]

    resources = [
      "${aws_s3_bucket.website.arn}/*", # Apply to all objects in the bucket
    ]
  }
}

# Apply the public read policy to the bucket
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id
  policy = data.aws_iam_policy_document.website_policy.json # Use the policy defined above

  # Wait for public access block to be configured first
  depends_on = [aws_s3_bucket_public_access_block.website]
}

# CORS configuration for the S3 bucket
# This allows web browsers to make requests to S3 from different domains
resource "aws_s3_bucket_cors_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  cors_rule {
    allowed_headers = ["*"]                                    # Allow any headers
    allowed_methods = ["PUT", "POST", "GET", "DELETE", "HEAD"] # Allow these HTTP methods
    allowed_origins = ["*"]                                    # Allow requests from any domain
    expose_headers  = ["ETag"]                                 # Expose ETag header to client
    max_age_seconds = 3000                                     # Cache preflight requests for 50 minutes
  }
}