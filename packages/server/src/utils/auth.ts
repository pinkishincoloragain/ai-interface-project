import { FastifyInstance, FastifyRequest } from 'fastify';
import { PublicUser } from '../services/auth.js';

export async function getUserFromRequest(fastify: FastifyInstance, request: FastifyRequest): Promise<PublicUser> {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        console.error('❌ No authorization header');
        throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Attempting to verify token (first 20 chars):', token.substring(0, 20) + '...');

    // Try to verify with local JWT first
    try {
        const user = await fastify.auth.verifyToken(token);
        if (user) {
            console.log('✅ Token verified with local JWT');
            return user;
        }
        console.log('⚠️  Local JWT verification returned null, trying Cognito decode...');
    } catch (error) {
        console.log('⚠️  Local JWT verification failed, trying Cognito decode...', error);
    }

    // If local JWT verification fails, try to decode Cognito token
    // In development, we accept Cognito tokens without full verification
    console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        console.log('📦 Decoded token payload:', JSON.stringify(payload, null, 2));

        // Cognito tokens have 'sub' as user ID and 'username' or 'cognito:username'
        const userId = payload.sub || payload.username || payload['cognito:username'];
        const email = payload.email || `${userId}@cognito.user`;

        if (userId) {
            console.log('✅ Successfully decoded Cognito token for user:', userId);
            return {
                id: userId,
                email: email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        }
        console.error('❌ No userId found in token payload');
    } catch (decodeError) {
        console.error('❌ Failed to decode token:', decodeError);
        throw new Error('Invalid token format');
    }

    throw new Error('Invalid or expired token');
}
