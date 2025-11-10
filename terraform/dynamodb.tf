# DynamoDB table to store user profiles and information
resource "aws_dynamodb_table" "users" {
  name         = "${local.prefix}-users" # e.g., "seamlessai-dev-users"
  billing_mode = "PAY_PER_REQUEST"       # Pay only for what you use (no fixed costs)
  hash_key     = "id"                    # Primary key - unique user ID

  # Define the attributes that can be used as keys
  attribute {
    name = "id" # User ID (UUID)
    type = "S"  # String type
  }

  attribute {
    name = "email" # User's email address
    type = "S"     # String type
  }

  # Global Secondary Index - allows querying users by email
  # This is like a secondary table that's automatically maintained
  global_secondary_index {
    name            = "email-index" # Name of the index
    hash_key        = "email"       # Can query by email
    projection_type = "ALL"         # Include all attributes in index
  }

  # Enable point-in-time recovery for data protection
  point_in_time_recovery {
    enabled = true # Can restore table to any point in the last 35 days
  }

  tags = local.common_tags
}

# DynamoDB table to store chat threads/conversations
resource "aws_dynamodb_table" "threads" {
  name         = "${local.prefix}-threads" # e.g., "seamlessai-dev-threads"
  billing_mode = "PAY_PER_REQUEST"         # Pay-per-use pricing
  hash_key     = "id"                      # Primary key - unique thread ID
  range_key    = "user_id"                 # Sort key - which user owns this thread

  # Composite key (id + user_id) allows multiple users to have threads with same ID
  # but ensures each user's threads are separate

  attribute {
    name = "id" # Thread ID (UUID)
    type = "S"  # String type
  }

  attribute {
    name = "user_id" # ID of user who owns this thread
    type = "S"       # String type
  }

  attribute {
    name = "created_at" # When the thread was created (ISO timestamp)
    type = "S"          # String type
  }

  # Global Secondary Index - query all threads for a specific user, ordered by creation time
  global_secondary_index {
    name            = "user-threads-index" # Index name
    hash_key        = "user_id"            # Query by user ID
    range_key       = "created_at"         # Sort by creation time (newest first)
    projection_type = "ALL"                # Include all thread data in index
  }

  point_in_time_recovery {
    enabled = true # Data backup and recovery
  }

  tags = local.common_tags
}

# DynamoDB table to store individual messages within chat threads
resource "aws_dynamodb_table" "messages" {
  name         = "${local.prefix}-messages" # e.g., "seamlessai-dev-messages"
  billing_mode = "PAY_PER_REQUEST"          # Pay-per-use pricing
  hash_key     = "thread_id"                # Primary key - which thread this message belongs to
  range_key    = "created_at"               # Sort key - when message was created

  # This structure allows efficient queries:
  # - Get all messages in a thread, ordered by time
  # - Get messages in a thread within a time range

  attribute {
    name = "thread_id" # Thread this message belongs to
    type = "S"         # String type
  }

  attribute {
    name = "created_at" # Message timestamp (ISO format)
    type = "S"          # String type
  }

  attribute {
    name = "id" # Unique message ID
    type = "S"  # String type
  }

  # Global Secondary Index - allows querying individual messages by ID
  # Useful for editing, deleting, or referencing specific messages
  global_secondary_index {
    name            = "message-id-index" # Index name
    hash_key        = "id"               # Query by message ID
    projection_type = "ALL"              # Include all message data
  }

  point_in_time_recovery {
    enabled = true # Data backup and recovery
  }

  tags = local.common_tags
}
