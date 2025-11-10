import { FastifyInstance } from 'fastify';

export interface User {
    id: string;
    email: string;
    password_hash: string;
    created_at: string;
    updated_at: string;
}

export interface Thread {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    thread_id: string;
    user_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export class DatabaseService {
    private fastify: FastifyInstance;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    async initializeSchema() {
        const client = await this.fastify.pg.connect();

        try {
            // Create users table
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);

            // Create threads table
            await client.query(`
                CREATE TABLE IF NOT EXISTS threads (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(500) NOT NULL DEFAULT 'New Chat',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);

            // Create messages table
            await client.query(`
                CREATE TABLE IF NOT EXISTS messages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);

            // Create indexes for better performance
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id);
                CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at DESC);
                CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
                CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
            `);

            console.log('Database schema initialized successfully');
        } finally {
            client.release();
        }
    }

    // User operations
    async createUser(email: string, passwordHash: string): Promise<User> {
        const client = await this.fastify.pg.connect();

        try {
            const result = await client.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *', [
                email,
                passwordHash,
            ]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const client = await this.fastify.pg.connect();

        try {
            const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    async getUserById(id: string): Promise<User | null> {
        const client = await this.fastify.pg.connect();

        try {
            const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    // Thread operations
    async createThread(userId: string, title: string = 'New Chat'): Promise<Thread> {
        const client = await this.fastify.pg.connect();

        try {
            const result = await client.query('INSERT INTO threads (user_id, title) VALUES ($1, $2) RETURNING *', [
                userId,
                title,
            ]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getUserThreads(userId: string): Promise<Thread[]> {
        const client = await this.fastify.pg.connect();

        try {
            const result = await client.query('SELECT * FROM threads WHERE user_id = $1 ORDER BY updated_at DESC', [
                userId,
            ]);
            return result.rows;
        } finally {
            client.release();
        }
    }

    async getThread(threadId: string, userId: string): Promise<Thread | null> {
        const client = await this.fastify.pg.connect();

        try {
            const result = await client.query('SELECT * FROM threads WHERE id = $1 AND user_id = $2', [
                threadId,
                userId,
            ]);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    async updateThread(threadId: string, userId: string, updates: Partial<Thread>): Promise<Thread | null> {
        const client = await this.fastify.pg.connect();

        try {
            const setClause = Object.keys(updates)
                .filter((key) => key !== 'id' && key !== 'user_id')
                .map((key, index) => `${key} = $${index + 3}`)
                .join(', ');

            if (!setClause) return null;

            const values = [
                threadId,
                userId,
                ...Object.values(updates).filter((_, index) => {
                    const key = Object.keys(updates)[index];
                    return key !== 'id' && key !== 'user_id';
                }),
            ];

            const result = await client.query(
                `UPDATE threads SET ${setClause}, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
                values
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    async deleteThread(threadId: string, userId: string): Promise<boolean> {
        const client = await this.fastify.pg.connect();

        try {
            const result = await client.query('DELETE FROM threads WHERE id = $1 AND user_id = $2', [threadId, userId]);
            return result.rowCount > 0;
        } finally {
            client.release();
        }
    }

    // Message operations
    async createMessage(
        threadId: string,
        userId: string,
        role: 'user' | 'assistant',
        content: string,
        messageId?: string
    ): Promise<Message> {
        const client = await this.fastify.pg.connect();

        try {
            const query = messageId
                ? 'INSERT INTO messages (id, thread_id, user_id, role, content) VALUES ($1, $2, $3, $4, $5) RETURNING *'
                : 'INSERT INTO messages (thread_id, user_id, role, content) VALUES ($1, $2, $3, $4) RETURNING *';

            const values = messageId ? [messageId, threadId, userId, role, content] : [threadId, userId, role, content];

            const result = await client.query(query, values);

            // Update thread's updated_at timestamp
            await client.query('UPDATE threads SET updated_at = NOW() WHERE id = $1', [threadId]);

            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getThreadMessages(threadId: string, userId: string): Promise<Message[]> {
        const client = await this.fastify.pg.connect();

        try {
            // Verify thread belongs to user
            const threadCheck = await client.query('SELECT id FROM threads WHERE id = $1 AND user_id = $2', [
                threadId,
                userId,
            ]);

            if (threadCheck.rows.length === 0) {
                return [];
            }

            const result = await client.query('SELECT * FROM messages WHERE thread_id = $1 ORDER BY created_at ASC', [
                threadId,
            ]);
            return result.rows;
        } finally {
            client.release();
        }
    }

    async upsertMessage(
        messageId: string,
        threadId: string,
        userId: string,
        role: 'user' | 'assistant',
        content: string
    ): Promise<Message> {
        const client = await this.fastify.pg.connect();

        try {
            const result = await client.query(
                `
                INSERT INTO messages (id, thread_id, user_id, role, content) 
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) 
                DO UPDATE SET content = EXCLUDED.content, created_at = NOW()
                RETURNING *
            `,
                [messageId, threadId, userId, role, content]
            );

            // Update thread's updated_at timestamp
            await client.query('UPDATE threads SET updated_at = NOW() WHERE id = $1', [threadId]);

            return result.rows[0];
        } finally {
            client.release();
        }
    }
}
