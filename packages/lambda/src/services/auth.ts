import {
    CognitoIdentityProviderClient,
    AdminInitiateAuthCommand,
    AdminCreateUserCommand,
    AdminSetUserPasswordCommand,
    AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';
import { secrets as _secrets } from './index';
import { logger } from '../utils/logger';

interface User {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
}

interface Session {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    user: User;
}

export class AuthService {
    private client: CognitoIdentityProviderClient;
    private userPoolId: string;
    private clientId: string;

    constructor() {
        this.client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.userPoolId = process.env.USER_POOL_ID || '';
        this.clientId = process.env.USER_POOL_CLIENT_ID || '';
    }

    async signUp(email: string, password: string): Promise<{ user: User; session: Session } | { error: string }> {
        try {
            // Generate a unique username since the pool uses email alias
            const username = uuidv4();

            // Create user in Cognito
            const createUserCommand = new AdminCreateUserCommand({
                UserPoolId: this.userPoolId,
                Username: username,
                UserAttributes: [
                    {
                        Name: 'email',
                        Value: email,
                    },
                    {
                        Name: 'email_verified',
                        Value: 'true',
                    },
                ],
                MessageAction: 'SUPPRESS', // Don't send welcome email
                TemporaryPassword: password,
            });

            await this.client.send(createUserCommand);

            // Set permanent password
            const setPasswordCommand = new AdminSetUserPasswordCommand({
                UserPoolId: this.userPoolId,
                Username: username,
                Password: password,
                Permanent: true,
            });

            await this.client.send(setPasswordCommand);

            // Sign in the user
            return this.signIn(email, password);
        } catch (error: unknown) {
            logger.error('Sign up error', error);

            if (error instanceof Error && error.name === 'UsernameExistsException') {
                return { error: 'User with this email already exists' };
            }

            return { error: 'Failed to create user' };
        }
    }

    async signIn(email: string, password: string): Promise<{ user: User; session: Session } | { error: string }> {
        try {
            const command = new AdminInitiateAuthCommand({
                UserPoolId: this.userPoolId,
                ClientId: this.clientId,
                AuthFlow: 'ADMIN_NO_SRP_AUTH',
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: password,
                },
            });

            const response = await this.client.send(command);

            if (!response.AuthenticationResult) {
                return { error: 'Authentication failed' };
            }

            const { AccessToken, RefreshToken, ExpiresIn, TokenType } = response.AuthenticationResult;

            if (!AccessToken || !RefreshToken) {
                return { error: 'Invalid authentication response' };
            }

            // Get user details
            const user = await this.getUserFromToken(AccessToken);
            if (!user) {
                return { error: 'Failed to get user details' };
            }

            const session: Session = {
                access_token: AccessToken,
                refresh_token: RefreshToken,
                expires_in: ExpiresIn || 3600,
                token_type: TokenType || 'Bearer',
                user,
            };

            return { user, session };
        } catch (error: unknown) {
            logger.error('Sign in error', error);

            if (error instanceof Error && error.name === 'NotAuthorizedException') {
                return { error: 'Invalid email or password' };
            }

            return { error: 'Authentication failed' };
        }
    }

    async verifyToken(token: string): Promise<User | null> {
        try {
            // For Cognito tokens, we can decode and verify
            const decoded = jwt.decode(token) as { email?: string; sub?: string; [key: string]: unknown } | null;

            if (!decoded || !decoded.email) {
                return null;
            }

            // Get fresh user data from Cognito
            return this.getUserFromToken(token);
        } catch (error) {
            logger.error('Token verification error', error);
            return null;
        }
    }

    async refreshSession(refreshToken: string): Promise<{ user: User; session: Session } | { error: string }> {
        try {
            const command = new AdminInitiateAuthCommand({
                UserPoolId: this.userPoolId,
                ClientId: this.clientId,
                AuthFlow: 'REFRESH_TOKEN_AUTH',
                AuthParameters: {
                    REFRESH_TOKEN: refreshToken,
                },
            });

            const response = await this.client.send(command);

            if (!response.AuthenticationResult) {
                return { error: 'Token refresh failed' };
            }

            const { AccessToken, ExpiresIn, TokenType } = response.AuthenticationResult;

            if (!AccessToken) {
                return { error: 'Invalid refresh response' };
            }

            // Get user details
            const user = await this.getUserFromToken(AccessToken);
            if (!user) {
                return { error: 'Failed to get user details' };
            }

            const session: Session = {
                access_token: AccessToken,
                refresh_token: refreshToken, // Keep the same refresh token
                expires_in: ExpiresIn || 3600,
                token_type: TokenType || 'Bearer',
                user,
            };

            return { user, session };
        } catch (error: unknown) {
            logger.error('Token refresh error', error);
            return { error: 'Token refresh failed' };
        }
    }

    private async getUserFromToken(accessToken: string): Promise<User | null> {
        try {
            // Decode token to get username
            const decoded = jwt.decode(accessToken) as {
                username?: string;
                sub?: string;
                iat?: number;
                [key: string]: unknown;
            } | null;

            if (!decoded || !decoded.username) {
                return null;
            }

            const command = new AdminGetUserCommand({
                UserPoolId: this.userPoolId,
                Username: decoded.username,
            });

            const response = await this.client.send(command);

            if (!response.UserAttributes) {
                return null;
            }

            const email = response.UserAttributes.find((attr) => attr.Name === 'email')?.Value;

            if (!email) {
                return null;
            }

            return {
                id: decoded.sub!, // Cognito user ID
                email,
                created_at: new Date((decoded.iat || 0) * 1000).toISOString(),
                updated_at: new Date().toISOString(),
            };
        } catch (error) {
            logger.error('Get user from token error', error);
            return null;
        }
    }
}
