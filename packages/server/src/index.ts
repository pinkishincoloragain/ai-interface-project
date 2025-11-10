import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifySSEPlugin from 'fastify-sse-v2';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import postgres from '@fastify/postgres';
import jwt from '@fastify/jwt';

// 라우트 handlers
import { registerChatRoutes } from './routes/chat.js';
import { registerStreamRoutes } from './routes/stream.js';
import { registerSSERoutes } from './routes/sse.js';
import { registerTestRoutes } from './routes/test.js';
import { registerAuthRoutes } from './routes/auth.js';
import { openaiService } from './services/openai.js';
import { DatabaseService } from './services/database.js';
import { AuthService } from './services/auth.js';

async function startServer() {
    try {
        // eslint-disable-next-line no-console
        console.log('Starting server setup...');

        // Reinitialize OpenAI service after .env is loaded
        openaiService.reinitialize();

        const fastify = Fastify({
            logger: true,
        });

        // JWT 플러그인 등록
        await fastify.register(jwt, {
            secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        });

        // PostgreSQL 플러그인 등록
        await fastify.register(postgres, {
            connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/seamlessai',
        });

        // Initialize services
        const dbService = new DatabaseService(fastify);
        const authService = new AuthService(fastify, dbService);

        // Initialize database schema
        await dbService.initializeSchema();

        // Make services available to routes
        fastify.decorate('db', dbService);
        fastify.decorate('auth', authService);

        // CORS 설정
        await fastify.register(cors, {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        });

        // Request logging middleware
        fastify.addHook('onRequest', async () => {
            // Request logging handled by Fastify logger
        });

        // Swagger 문서 설정 - OpenAPI 3.0 사용
        await fastify.register(swagger, {
            openapi: {
                openapi: '3.0.0',
                info: {
                    title: 'Seamless AI Interface API',
                    description: 'AI 인터페이스를 위한 API 문서',
                    version: '0.1.0',
                },
                servers: [
                    {
                        url: 'http://localhost:3001',
                        description: 'Development server',
                    },
                ],
                tags: [
                    { name: 'chat', description: '채팅 관련 API' },
                    { name: 'stream', description: '스트리밍 관련 API' },
                    { name: 'sse', description: 'SSE 관련 API' },
                ],
                components: {
                    securitySchemes: {
                        apiKey: {
                            type: 'apiKey',
                            name: 'apiKey',
                            in: 'header',
                        },
                    },
                },
            },
        });

        // Swagger UI 설정
        await fastify.register(swaggerUI, {
            routePrefix: '/documentation',
            uiConfig: {
                docExpansion: 'list',
                deepLinking: false,
            },
            uiHooks: {
                onRequest: function (request, reply, next) {
                    next();
                },
                preHandler: function (request, reply, next) {
                    next();
                },
            },
            staticCSP: true,
            transformStaticCSP: (header) => header,
            transformSpecification: (swaggerObject, _request, _reply) => swaggerObject,
        });

        // 플러그인 등록
        await fastify.register(fastifySSEPlugin);

        // 라우트 등록
        registerAuthRoutes(fastify);
        registerChatRoutes(fastify);
        registerStreamRoutes(fastify);
        registerSSERoutes(fastify);
        registerTestRoutes(fastify);

        // 서버 시작
        try {
            const address = await fastify.listen({ port: 3001, host: '0.0.0.0' });
            // eslint-disable-next-line no-console
            console.log(`서버가 ${address} 에서 실행 중입니다.`);
            // eslint-disable-next-line no-console
            console.log('API 문서는 http://localhost:3001/documentation 에서 확인할 수 있습니다.');

            // Swagger JSON 엔드포인트 확인
            // eslint-disable-next-line no-console
            console.log('Swagger JSON: http://localhost:3001/documentation/json');

            // Keep server alive
            // eslint-disable-next-line no-console
            console.log('Server is running and ready to accept connections!');
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Server startup error:', err);
            fastify.log.error(err);
            process.exit(1);
        }
    } catch (globalErr) {
        // eslint-disable-next-line no-console
        console.error('Global server error:', globalErr);
        process.exit(1);
    }
}

startServer();
