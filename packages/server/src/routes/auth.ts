import { FastifyInstance } from 'fastify';

export function registerAuthRoutes(fastify: FastifyInstance) {
    // POST /api/auth/login
    fastify.post<{
        Body: {
            email: string;
            password: string;
        };
    }>('/api/auth/login', async (request, reply) => {
        try {
            const { email, password } = request.body;

            if (!email || !password) {
                return reply.code(400).send({ error: 'Email and password are required' });
            }

            const result = await fastify.auth.signIn(email, password);

            if ('error' in result) {
                return reply.code(401).send({ error: result.error });
            }

            return reply.send({
                user: result.user,
                session: result.session,
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to sign in' });
        }
    });

    // POST /api/auth/signup
    fastify.post<{
        Body: {
            email: string;
            password: string;
        };
    }>('/api/auth/signup', async (request, reply) => {
        try {
            const { email, password } = request.body;

            if (!email || !password) {
                return reply.code(400).send({ error: 'Email and password are required' });
            }

            if (password.length < 6) {
                return reply.code(400).send({ error: 'Password must be at least 6 characters' });
            }

            const result = await fastify.auth.signUp(email, password);

            if ('error' in result) {
                return reply.code(400).send({ error: result.error });
            }

            return reply.send({
                user: result.user,
                session: result.session,
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to sign up' });
        }
    });

    // POST /api/auth/logout
    fastify.post('/api/auth/logout', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                return reply.code(401).send({ error: 'No authorization header' });
            }

            // For JWT-based auth, we just verify the token exists and is valid
            const token = authHeader.replace('Bearer ', '');
            const user = await fastify.auth.verifyToken(token);

            if (!user) {
                return reply.code(401).send({ error: 'Invalid token' });
            }

            // With JWT, we don't need to invalidate server-side
            // Client will remove the token from storage
            return reply.send({ success: true });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to sign out' });
        }
    });

    // GET /api/auth/user - Get current user info
    fastify.get('/api/auth/user', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                return reply.code(401).send({ error: 'No authorization header' });
            }

            const token = authHeader.replace('Bearer ', '');
            const user = await fastify.auth.verifyToken(token);

            if (!user) {
                return reply.code(401).send({ error: 'Invalid or expired token' });
            }

            return reply.send({ user });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to get user info' });
        }
    });

    // POST /api/auth/refresh - Refresh access token
    fastify.post<{
        Body: {
            refresh_token: string;
        };
    }>('/api/auth/refresh', async (request, reply) => {
        try {
            const { refresh_token } = request.body;

            if (!refresh_token) {
                return reply.code(400).send({ error: 'Refresh token is required' });
            }

            const result = await fastify.auth.refreshSession(refresh_token);

            if ('error' in result) {
                return reply.code(401).send({ error: result.error });
            }

            return reply.send({
                session: result.session,
                user: result.user,
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to refresh token' });
        }
    });
}
