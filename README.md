# Seamless AI Interface Project

Modern AI chat interface implementation using OpenAI GPT models with real-time streaming capabilities.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Zustand, TanStack Query
- **Backend**: Fastify/Supabase Edge Functions, TypeScript, OpenAI SDK
- **AI Model**: OpenAI GPT-4o-mini (configurable)
- **Database**: Supabase PostgreSQL (for production) / In-memory (for development)
- **Architecture**: Feature-Sliced Design (FSD)
- **Package Management**: PNPM Workspaces (Monorepo)
- **Code Quality**: ESLint, Prettier, Husky, lint-staged
- **Testing**: Jest, React Testing Library
- **Deployment**: Docker, Supabase

## Project Structure

```
ai-interface-project/
├── packages/
│   ├── client/             # React + TypeScript frontend
│   │   ├── src/
│   │   │   ├── app/        # Application layer (providers, router)
│   │   │   ├── features/   # Feature-based modules
│   │   │   ├── shared/     # Shared utilities and components
│   │   │   └── pages/      # Page components
│   ├── server/             # Fastify server
│   └── shared/             # Shared types and utilities
├── supabase/               # Supabase configuration
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database migrations
├── .github/                # GitHub Actions workflows
├── .husky/                 # Git hooks
├── .vscode/                # VS Code configuration
└── docker-compose.yml      # Docker Compose setup
```

## Features

- **Real-time AI Chat**: OpenAI GPT integration with streaming responses
- **Thread Management**: Organize conversations in separate threads
- **Multiple Communication Protocols**: REST API, Server-Sent Events (SSE)
- **State Management**: XState for complex state orchestration, Zustand for UI state
- **Authentication**: Supabase Auth with email/password
- **Responsive Design**: Modern UI with Radix UI and TailwindCSS
- **Error Handling**: Comprehensive error boundaries and fallback mechanisms
- **Real-time Updates**: Live message streaming and status updates

## Getting Started

### Prerequisites

- Node.js v16+
- PNPM v7+
- OpenAI API key
- Supabase account (for production deployment)

### Environment Setup

1. **Clone and Install Dependencies**

    ```bash
    git clone <repository-url>
    cd ai-interface-project
    pnpm install
    ```

2. **Environment Variables**

    Create `.env` file in project root:

    ```bash
    cp .env.example .env
    ```

    Configure your environment:

    ```env
    # OpenAI Configuration
    OPENAI_API_KEY=sk-your-openai-api-key-here
    OPENAI_MODEL=gpt-4o-mini
    OPENAI_MAX_TOKENS=1000
    OPENAI_TEMPERATURE=0.7

    # Supabase Configuration (for production)
    VITE_SUPABASE_URL=https://your-project.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-key
    ```

    > Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys) > **중요**: OpenAI API 키는 [STREAMING_STUDY.md](https://github.com/pinkishincoloragain/ai-interface-project/blob/main/STREAMING_STUDY.md)) 최하단을 확인해주세요.

3. **Test OpenAI Connection**

    ```bash
    cd packages/server
    pnpm test:openai
    ```

### Development

#### Local Development (Fastify Server)

```bash
# Run both client and server
pnpm dev

# Run individually
pnpm dev:client  # http://localhost:3000
pnpm dev:server  # http://localhost:3001
```

#### Supabase Development

```bash
# Start Supabase locally
pnpm dev:supabase

# Run Edge Functions locally
pnpm dev:supabase-functions

# Run client with Supabase
pnpm dev:client
```

#### Endpoints

- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:3001
- **API Docs**: http://localhost:3001/documentation
- **Supabase Studio**: http://localhost:54323

### Scripts

```bash
# Code Quality
pnpm lint          # Run ESLint
pnpm lint:fix      # Fix linting issues
pnpm format        # Format code with Prettier

# Testing
pnpm test          # Run tests
pnpm test:watch    # Watch mode
pnpm test:coverage # Coverage report

# Building
pnpm build         # Build all packages
pnpm build:client  # Build frontend only
```

### Deployment

#### Docker

```bash
# Production build and run
docker-compose up --build

# Development environment
docker-compose up --build dev
```

#### Supabase

```bash
# Automated deployment
./deploy.sh

# Manual deployment
supabase link --project-ref YOUR_PROJECT_ID
pnpm migrate:db
pnpm deploy:functions
supabase secrets set OPENAI_API_KEY="your-key"
pnpm build:client
```

## API Reference

### Chat Endpoints

- **POST** `/api/chat` - Send chat message
- **POST** `/api/chat/sse` - Streaming chat with SSE
- **GET** `/api/threads` - List conversation threads
- **GET** `/api/threads/:id` - Get specific thread
- **POST** `/api/threads` - Create new thread

### Supabase Edge Functions

- `/functions/v1/chat` - Chat completion
- `/functions/v1/stream` - Streaming responses
- `/functions/v1/threads` - Thread management

### Health Checks

- **GET** `/api/test/openai` - Test OpenAI connection
- **GET** `/api/test/health` - Server health check

### Environment Variables

| Variable                 | Description                   | Default       | Required |
| ------------------------ | ----------------------------- | ------------- | -------- |
| `OPENAI_API_KEY`         | OpenAI API key                | -             | Yes      |
| `OPENAI_MODEL`           | OpenAI model to use           | `gpt-4o-mini` | No       |
| `OPENAI_MAX_TOKENS`      | Max completion tokens         | `1000`        | No       |
| `OPENAI_TEMPERATURE`     | Response creativity (0.0-2.0) | `0.7`         | No       |
| `VITE_SUPABASE_URL`      | Supabase project URL          | -             | No\*     |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key             | -             | No\*     |

\*Required for Supabase deployment

## Infrastructure Architecture

```mermaid
graph TB
    %% Client Layer
    subgraph "Frontend (Vite + React)"
        Client[React Client<br/>Vite + TypeScript<br/>TailwindCSS]
        Router[TanStack Router]
        StateManager[State Management<br/>XState + Zustand]
    end

    %% Authentication Layer
    subgraph "Authentication"
        Auth[Supabase Auth<br/>Email/Password<br/>JWT Tokens]
    end

    %% API Gateway / Edge Functions
    subgraph "Supabase Edge Functions (Deno)"
        ChatFunc["/functions/v1/chat"<br/>OpenAI Integration<br/>Non-streaming]
        StreamFunc["/functions/v1/stream"<br/>OpenAI Streaming<br/>SSE Response]
        ThreadsFunc["/functions/v1/threads"<br/>CRUD Operations<br/>Thread Management]
        MessagesFunc["/functions/v1/messages"<br/>Message Storage<br/>Thread Association]
    end

    %% External Services
    subgraph "External APIs"
        OpenAI[OpenAI API<br/>GPT-4o-mini<br/>Chat Completions]
    end

    %% Database Layer
    subgraph "Supabase Backend"
        DB[(PostgreSQL Database)]
        subgraph "Tables"
            ThreadsTable[threads<br/>- id, title, user_id<br/>- created_at, updated_at]
            MessagesTable[messages<br/>- id, thread_id, user_id<br/>- role, content, created_at]
            UsersTable[auth.users<br/>Managed by Supabase Auth]
        end
        RLS[Row Level Security<br/>User Data Isolation]
    end

    %% Data Flow Connections
    Client --> Router
    Router --> StateManager
    StateManager --> Auth

    Client -->|"REST/SSE"| ChatFunc
    Client -->|"SSE Streaming"| StreamFunc
    Client -->|"CRUD"| ThreadsFunc
    Client -->|"CRUD"| MessagesFunc

    Auth -->|"JWT Verification"| ChatFunc
    Auth -->|"JWT Verification"| StreamFunc
    Auth -->|"JWT Verification"| ThreadsFunc
    Auth -->|"JWT Verification"| MessagesFunc

    ChatFunc -->|"API Calls"| OpenAI
    StreamFunc -->|"Streaming API"| OpenAI

    ThreadsFunc -->|"SQL Queries"| ThreadsTable
    MessagesFunc -->|"SQL Queries"| MessagesTable
    ChatFunc -->|"Message Storage"| MessagesTable
    StreamFunc -->|"Message Storage"| MessagesTable

    ThreadsTable --> DB
    MessagesTable --> DB
    UsersTable --> DB
    DB --> RLS

    %% Styling
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef database fill:#e8f5e8
    classDef external fill:#fff3e0
    classDef auth fill:#fce4ec

    class Client,Router,StateManager frontend
    class ChatFunc,StreamFunc,ThreadsFunc,MessagesFunc backend
    class DB,ThreadsTable,MessagesTable,UsersTable,RLS database
    class OpenAI external
    class Auth auth
```

## Architecture

This project follows **Feature-Sliced Design (FSD)** principles:

```
src/
├── app/          # Application layer (providers, router)
├── pages/        # Pages layer (route components)
├── features/     # Feature layer (business logic)
│   ├── chat/     # Chat functionality
│   ├── thread/   # Thread management
│   └── auth/     # Authentication
├── entities/     # Entities layer (data models)
├── shared/       # Shared layer (UI components, utils)
└── widgets/      # Widgets layer (complex UI blocks)
```

### State Management

- **XState**: Complex state machines for chat flow
- **Zustand**: Simple UI state management
- **TanStack Query**: Server state management

### Key Features

- **Real-time Streaming**: SSE-based message streaming
- **Thread Management**: Organized conversation handling
- **Error Boundaries**: Comprehensive error handling
- **Responsive Design**: Mobile-first approach
- **Performance**: Optimized rendering and caching

### Development Guidelines

#### Adding New Components

Follow FSD structure:

```
features/chat/ui/MessageInput/
├── index.tsx              # Component implementation
├── MessageInput.test.tsx  # Tests
└── MessageInput.stories.tsx # Storybook stories
```

#### OpenAI Model Configuration

```env
# Available models
OPENAI_MODEL=gpt-4o-mini    # Default (fast & cost-effective)
OPENAI_MODEL=gpt-3.5-turbo  # Fast responses
OPENAI_MODEL=gpt-4          # High quality
OPENAI_MODEL=gpt-4-turbo    # Extended context
```

## Troubleshooting

### Common Issues

1. **OpenAI API Key Errors**

    - Verify `.env` file exists in project root
    - Check API key starts with `sk-`
    - Ensure sufficient credits in OpenAI account
    - Run: `cd packages/server && pnpm test:openai`

2. **Server Startup Errors**

    - Verify Node.js v16+
    - Run `pnpm install` to install dependencies
    - Test OpenAI setup: `pnpm test:openai`

3. **Supabase Deployment Issues**

    - Check project ID and access token
    - Verify Edge Function secrets are set
    - Review Edge Function logs in Supabase Dashboard

4. **CORS Errors**
    - Check CORS configuration in server settings
    - Verify allowed origins match your domain

### Debug Endpoints

- **OpenAI Test**: `http://localhost:3001/api/test/openai`
- **Health Check**: `http://localhost:3001/api/test/health`
- **Supabase Studio**: `http://localhost:54323`

## Contributing

1. Follow Feature-Sliced Design principles
2. Add JSDoc comments for components and functions
3. Write tests for new features
4. Update documentation for API changes
5. Follow existing code style and conventions

## License

This project is licensed under the MIT License.
