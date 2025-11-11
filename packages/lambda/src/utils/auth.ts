import { auth } from '../services/index';
import type { LambdaRequest } from '../types';

interface User {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
}

export async function getUserFromRequest(req: LambdaRequest): Promise<User> {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
        throw new Error('No token provided');
    }

    const user = await auth.verifyToken(token);

    if (!user) {
        throw new Error('Invalid or expired token');
    }

    return user;
}
