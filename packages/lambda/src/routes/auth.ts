import { auth } from '../services/index';
import { logger } from '../utils/logger';
import type { Router, AuthRequest } from '../types';

export function authRoutes(router: Router) {
    router.register('POST', '/api/auth/signup', async (req) => {
        try {
            const { email, password } = req.body as AuthRequest['body'];

            if (!email || !password) {
                return {
                    statusCode: 400,
                    body: { error: 'Email and password are required' },
                };
            }

            const result = await auth.signUp(email, password);

            if ('error' in result) {
                return {
                    statusCode: 400,
                    body: { error: result.error },
                };
            }

            return {
                statusCode: 200,
                body: result,
            };
        } catch (error) {
            logger.error('Signup error', error);
            return {
                statusCode: 500,
                body: { error: 'Internal server error' },
            };
        }
    });

    router.register('POST', '/api/auth/signin', async (req) => {
        try {
            const { email, password } = req.body as AuthRequest['body'];

            if (!email || !password) {
                return {
                    statusCode: 400,
                    body: { error: 'Email and password are required' },
                };
            }

            const result = await auth.signIn(email, password);

            if ('error' in result) {
                return {
                    statusCode: 401,
                    body: { error: result.error },
                };
            }

            return {
                statusCode: 200,
                body: result,
            };
        } catch (error) {
            logger.error('Signin error', error);
            return {
                statusCode: 500,
                body: { error: 'Internal server error' },
            };
        }
    });

    router.register('POST', '/api/auth/refresh', async (req) => {
        try {
            const { refresh_token } = req.body as AuthRequest['body'];

            if (!refresh_token) {
                return {
                    statusCode: 400,
                    body: { error: 'Refresh token is required' },
                };
            }

            const result = await auth.refreshSession(refresh_token);

            if ('error' in result) {
                return {
                    statusCode: 401,
                    body: { error: result.error },
                };
            }

            return {
                statusCode: 200,
                body: result,
            };
        } catch (error) {
            logger.error('Token refresh error', error);
            return {
                statusCode: 500,
                body: { error: 'Internal server error' },
            };
        }
    });

    router.register('POST', '/api/auth/signout', async (_req) =>
        // For Cognito, we don't need to do anything server-side for sign out
        // The client just needs to remove the tokens
        ({
            statusCode: 200,
            body: { message: 'Signed out successfully' },
        })
    );
}
