# SeamlessAI Interface Project - Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    Client (React + Vite)                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  App.tsx                                                                           │
│  ├── AuthProvider (Supabase Auth)                                                 │
│  ├── ThreadSidebarContainer                                                       │
│  │   ├── ThreadStore (Zustand)                                                   │
│  │   └── Thread Management                                                       │
│  └── ChatContainer                                                               │
│      ├── ChatStore (Zustand)                                                     │
│      ├── StreamingMachine (XState)                                               │
│      ├── MessageList                                                             │
│      ├── InputBox                                                                │
│      └── StreamingIndicator                                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                              Features & Services                                   │
│  ├── features/chat/                                                               │
│  │   ├── hooks/ (useChat, useChatActions, useChatState)                         │
│  │   ├── services/ (ChatService, MessageService, StreamingService)              │
│  │   └── lib/ (chat-sse-adapter, sse-reader, schemas)                           │
│  ├── features/thread/                                                             │
│  │   ├── api/ (threadApi, queries)                                               │
│  │   └── model/ (store)                                                          │
│  ├── features/auth/                                                               │
│  │   └── model/ (hooks, store)                                                   │
│  └── shared/                                                                      │
│      ├── api/ (base API client)                                                  │
│      └── lib/streaming/ (streamingMachine)                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTP/SSE Connections
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Server (Fastify + Node.js)                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  index.ts (Main Server Entry)                                                     │
│  ├── Fastify Instance                                                             │
│  ├── CORS Configuration                                                           │
│  ├── Swagger/OpenAPI Documentation                                                │
│  └── SSE Plugin Registration                                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                    Routes                                          │
│  ├── /api/chat (chat.ts)                                                         │
│  │   ├── POST /api/chat (Standard chat completion)                               │
│  │   ├── GET/POST/PUT/DELETE /api/threads/* (Thread CRUD)                       │
│  │   ├── GET /api/threads/:id/messages                                           │
│  │   └── POST /api/messages/save (Partial message saving)                       │
│  ├── /api/chat/sse (sse.ts)                                                      │
│  │   ├── GET /api/sse (Basic SSE connection)                                     │
│  │   └── POST /api/chat/sse (Streaming chat responses)                          │
│  ├── /api/stream (stream.ts)                                                     │
│  └── /api/test (test.ts)                                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                   Services                                         │
│  ├── OpenAIService                                                               │
│  │   ├── Chat Completion API                                                     │
│  │   ├── Streaming Chat Completion                                               │
│  │   └── Configuration Management                                                │
│  ├── SupabaseService                                                             │
│  │   ├── User Authentication                                                     │
│  │   ├── Database Client Creation                                                │
│  │   └── User-scoped Clients                                                    │
│  ├── ThreadManager (In-Memory)                                                   │
│  │   ├── Thread Creation & Management                                            │
│  │   ├── Message Storage                                                         │
│  │   └── Legacy Compatibility Layer                                              │
│  └── FallbackService                                                             │
│      ├── Mock Chat Completions                                                   │
│      └── Mock Streaming Responses                                                │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Database Queries & Authentication
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Supabase (PostgreSQL + Auth)                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Database Schema:                                                                  │
│  ├── users (Supabase Auth)                                                       │
│  ├── threads                                                                     │
│  │   ├── id (UUID, PK)                                                          │
│  │   ├── user_id (UUID, FK → users)                                             │
│  │   ├── title (TEXT)                                                           │
│  │   ├── created_at, updated_at                                                  │
│  │   └── CASCADE DELETE relationship with messages                               │
│  └── messages                                                                    │
│      ├── id (UUID, PK)                                                          │
│      ├── thread_id (UUID, FK → threads)                                         │
│      ├── user_id (UUID, FK → users)                                             │
│      ├── role ('user' | 'assistant')                                            │
│      ├── content (TEXT)                                                         │
│      └── created_at                                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Supabase Edge Functions:                                                         │
│  ├── /functions/chat/ (Deno + OpenAI)                                           │
│  ├── /functions/messages/                                                        │
│  ├── /functions/stream/                                                          │
│  └── /functions/threads/                                                         │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ AI API Calls
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                OpenAI API                                          │
│  ├── Chat Completions API                                                         │
│  ├── Streaming Chat Completions                                                   │
│  └── Model: gpt-4o-mini (configurable)                                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              Data Flow Patterns:

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              1. Standard Chat Flow                                 │
│  User Input → ChatContainer → API Request → Server → OpenAI → Database →         │
│  Response → ChatContainer → UI Update                                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              2. Streaming Chat Flow                                │
│  User Input → StreamingMachine → SSE Connection → Server → OpenAI Stream →       │
│  Real-time Chunks → StreamingIndicator → UI Updates → Final Storage              │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              3. Thread Management Flow                             │
│  ThreadSidebar → Thread API → Server → Supabase → ThreadStore →                 │
│  UI Sync → ChatContainer Update                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                State Management:

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              XState Streaming Machine                              │
│  idle → connecting → streaming (active/paused) → completed/error/aborted/failed   │
│  ├── Retry Logic (max 3 retries)                                                 │
│  ├── Timeout Handling (30s default)                                              │
│  ├── Abort Controller Integration                                                 │
│  └── Buffer Management                                                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                Zustand Stores                                      │
│  ├── ChatStore (messages, loading states, current thread)                        │
│  ├── ThreadStore (thread list, active thread, CRUD operations)                   │
│  └── AuthStore (user state, authentication methods)                              │
└─────────────────────────────────────────────────────────────────────────────────────┘
```
