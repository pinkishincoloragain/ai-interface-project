import { FastifyInstance, FastifyRequest } from 'fastify';
import { PublicUser } from '../services/auth.js';

export async function getUserFromRequest(fastify: FastifyInstance, request: FastifyRequest): Promise<PublicUser> {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await fastify.auth.verifyToken(token);

    if (!user) {
        throw new Error('Invalid or expired token');
    }

    return user;
}
