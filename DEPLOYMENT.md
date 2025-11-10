# Deployment Guide

This project uses GitHub Actions for CI/CD with automatic deployment to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Supabase Project**: Your production Supabase instance

## Setup Instructions

### 1. Create Vercel Projects

Create two separate Vercel projects:

- **Frontend**: Import your repo, set root directory to `packages/client`
- **Backend**: Import your repo, set root directory to `packages/server`

### 2. Get Vercel Credentials

From Vercel dashboard:

1. Go to Settings → General → Project ID (copy this)
2. Go to Account Settings → Tokens → Create new token
3. Note your Team/Organization ID from account settings

### 3. Configure GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these repository secrets:

```
# Vercel Configuration
VERCEL_TOKEN=your_vercel_token_here
VERCEL_ORG_ID=your_organization_id_here
VERCEL_PROJECT_ID=your_frontend_project_id_here
VERCEL_SERVER_PROJECT_ID=your_backend_project_id_here

# Supabase Configuration (Production)
VITE_SUPABASE_URL=https://mcfcfbdhtkjxgqgawvfp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZmNmYmRodGtqeGdxZ2F3dmZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjY4OTQsImV4cCI6MjA3MDQwMjg5NH0.Tit5DvFiFGyjULx68sMR9Pxu0Wjl-b5bXlf1R693aqU

# OpenAI Configuration (for server)
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Environment Configuration

The project has environment-specific configurations:

#### Local Development

- Uses local Supabase (`http://127.0.0.1:54321`)
- Environment files: `.env` and `packages/client/.env`

#### Production Deployment

- Uses production Supabase (configured in `vercel.json` files)
- Environment variables managed through Vercel dashboard or GitHub secrets

### 5. Deployment Workflows

The project includes three workflows:

#### Production Deployment (`deploy.yml`)

- **Trigger**: Push to `main` branch
- **Actions**:
    - Runs tests and linting
    - Builds and deploys frontend to Vercel
    - Builds and deploys backend to Vercel
- **Environment**: `production`

#### Staging Deployment (`staging.yml`)

- **Trigger**: Push to `develop`/`staging` branches or PRs to `main`
- **Actions**:
    - Runs tests and builds
    - Deploys to staging environment
- **Environment**: `staging`

#### Existing Workflows

- CI testing and PR reviews
- Automated code reviews with Claude/GPT

## Manual Deployment

### Deploy Frontend to Vercel

```bash
# Build and deploy frontend
cd packages/client
vercel --prod
```

### Deploy Edge Functions to Supabase

```bash
# Login to Supabase first
npx supabase login

# Deploy all Edge Functions
npx supabase functions deploy --no-verify-jwt

# Or deploy individual functions
npx supabase functions deploy chat --no-verify-jwt
npx supabase functions deploy threads --no-verify-jwt
npx supabase functions deploy messages --no-verify-jwt
npx supabase functions deploy stream --no-verify-jwt
```

## Database Migrations

For database schema changes:

```bash
# Push migrations to remote Supabase
pnpm migrate:db

# Deploy Supabase functions
pnpm deploy:functions
```

## Vercel Configuration Files

The project includes pre-configured Vercel settings:

- `packages/client/vercel.json`: Frontend deployment config
- `packages/server/vercel.json`: Backend API deployment config

Both are configured with your production Supabase credentials.

## Troubleshooting

### Build Failures

- Check environment variables are set correctly
- Ensure all dependencies are installed
- Verify TypeScript compilation passes locally

### Deployment Issues

- Verify Vercel token has correct permissions
- Check project IDs match your Vercel projects
- Ensure build output directories are correct

### Database Connection Issues

- Verify Supabase URL and keys are correct
- Check RLS policies allow your application access
- Ensure database migrations are applied

## Security Notes

- Never commit API keys or secrets to version control
- Use GitHub Secrets for sensitive configuration
- Rotate API keys regularly
- Review Supabase RLS policies for security
