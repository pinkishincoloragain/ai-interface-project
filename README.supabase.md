# Supabase Deployment Guide

## Overview

This project has been configured for deployment on Supabase using:

- **Edge Functions** for the API backend (replacing Fastify server)
- **Static Hosting** for the React frontend
- **PostgreSQL** for data persistence
- **Email Authentication** for user management

## Prerequisites

1. **Supabase CLI**: Install globally

    ```bash
    npm install -g supabase
    ```

2. **Supabase Account**: Create a project at [supabase.com](https://supabase.com)

3. **Environment Variables**: Set up the following:
    - `SUPABASE_PROJECT_ID`: Your Supabase project reference ID
    - `SUPABASE_ACCESS_TOKEN`: Your Supabase access token
    - `OPENAI_API_KEY`: Your OpenAI API key

## Local Development with Supabase

1. **Start Supabase locally**:

    ```bash
    pnpm dev:supabase
    ```

2. **Serve Edge Functions locally**:

    ```bash
    pnpm dev:supabase-functions
    ```

3. **Run the client**:

    ```bash
    pnpm dev:client
    ```

4. **Set local environment variables**:
    ```bash
    # In packages/client/.env
    VITE_SUPABASE_URL=http://127.0.0.1:54321
    VITE_SUPABASE_ANON_KEY=your-local-anon-key
    ```

## Deployment

### Automated Deployment

Run the deployment script:

```bash
./deploy.sh
```

### Manual Deployment Steps

1. **Link to your Supabase project**:

    ```bash
    supabase link --project-ref YOUR_PROJECT_ID
    ```

2. **Run database migrations**:

    ```bash
    pnpm migrate:db
    ```

3. **Deploy Edge Functions**:

    ```bash
    pnpm deploy:functions
    ```

4. **Set Edge Function secrets**:

    ```bash
    supabase secrets set OPENAI_API_KEY="your-openai-api-key"
    ```

5. **Build and upload the client**:
    ```bash
    pnpm build:client
    # Upload dist folder to Supabase Storage
    ```

## Architecture Changes

### From Fastify Server to Edge Functions

- **Chat API**: `/api/chat` → Supabase Edge Function `/functions/v1/chat`
- **Streaming**: `/api/stream` → Supabase Edge Function `/functions/v1/stream`
- **Threads**: `/api/threads` → Supabase Edge Function `/functions/v1/threads`

### Authentication

- **Email/Password**: Integrated with Supabase Auth
- **Session Management**: Handled by Supabase client
- **Protected Routes**: Edge Functions verify JWT tokens

### Database Schema

```sql
-- Threads table
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Configuration Files

- `supabase/config.toml`: Supabase project configuration
- `supabase/functions/*/index.ts`: Edge Function implementations
- `supabase/migrations/`: Database migration files
- `packages/client/.env`: Frontend environment variables

## Features

✅ **Email Authentication**
✅ **OpenAI Chat Integration**
✅ **Real-time Streaming**
✅ **Thread Management**
✅ **Row Level Security (RLS)**
✅ **Static Site Hosting**

## Environment Variables

### Production

```bash
# Supabase Dashboard → Settings → API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Edge Function Secrets
OPENAI_API_KEY=your-openai-api-key
```

### Local Development

```bash
# After running supabase start
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Set in supabase/.env
OPENAI_API_KEY=your-openai-api-key
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check Edge Function CORS headers
2. **Auth Errors**: Verify JWT token in requests
3. **Database Errors**: Check RLS policies
4. **Function Errors**: Check Edge Function logs in Supabase Dashboard

### Debugging

- **Edge Function Logs**: Supabase Dashboard → Edge Functions → Logs
- **Database Logs**: Supabase Dashboard → Logs
- **Local Development**: Check browser console and terminal output
