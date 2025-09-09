#!/bin/bash

# Deployment script for Supabase deployment
set -e

echo "🚀 Starting deployment process..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "❌ SUPABASE_PROJECT_ID environment variable is not set"
    exit 1
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ SUPABASE_ACCESS_TOKEN environment variable is not set"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build the client
echo "🏗️  Building client application..."
pnpm build:client

# Link to Supabase project
echo "🔗 Linking to Supabase project..."
supabase link --project-ref $SUPABASE_PROJECT_ID

# Run database migrations
echo "🗄️  Running database migrations..."
supabase db push

# Deploy Edge Functions
echo "⚡ Deploying Edge Functions..."
supabase functions deploy chat --no-verify-jwt
supabase functions deploy stream --no-verify-jwt
supabase functions deploy threads --no-verify-jwt

# Set function secrets
echo "🔐 Setting Edge Function secrets..."
supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY"

# Upload client build to Storage
echo "📤 Uploading client build to Supabase Storage..."
supabase storage upload --bucket files --glob "packages/client/dist/**/*" --base-path "packages/client/dist"

echo "✅ Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure your custom domain in Supabase Dashboard"
echo "2. Update CORS settings if needed"
echo "3. Test your deployed application"