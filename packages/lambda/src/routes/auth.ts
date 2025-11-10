import { auth } from '../services/index';

export function authRoutes(router: any) {
    router.register('POST', '/api/auth/signup', async (req: any) => {
        try {
            const { email, password } = req.body;

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
            console.error('Signup error:', error);
            return {
                statusCode: 500,
                body: { error: 'Internal server error' },
            };
        }
    });

    router.register('POST', '/api/auth/signin', async (req: any) => {
        try {
            const { email, password } = req.body;

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
            console.error('Signin error:', error);
            return {
                statusCode: 500,
                body: { error: 'Internal server error' },
            };
        }
    });

    router.register('POST', '/api/auth/refresh', async (req: any) => {
        try {
            const { refresh_token } = req.body;

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
            console.error('Token refresh error:', error);
            return {
                statusCode: 500,
                body: { error: 'Internal server error' },
            };
        }
    });

    router.register('POST', '/api/auth/signout', async (req: any) =>
        // For Cognito, we don't need to do anything server-side for sign out
        // The client just needs to remove the tokens
        ({
            statusCode: 200,
            body: { message: 'Signed out successfully' },
        })
    );
}
