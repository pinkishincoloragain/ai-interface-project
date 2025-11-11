import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';
import { DatabaseService, User } from './database.js';

export interface Session {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
    token_type: string;
    user: PublicUser;
}

export interface PublicUser {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
}

export class AuthService {
    private fastify: FastifyInstance;
    private db: DatabaseService;

    constructor(fastify: FastifyInstance, db: DatabaseService) {
        this.fastify = fastify;
        this.db = db;
    }

    private toPublicUser(user: User): PublicUser {
        return {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };
    }

    async signUp(email: string, password: string): Promise<{ user: PublicUser; session: Session } | { error: string }> {
        try {
            // Check if user already exists
            const existingUser = await this.db.getUserByEmail(email);
            if (existingUser) {
                return { error: 'User already exists' };
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Create user
            const user = await this.db.createUser(email, passwordHash);
            const publicUser = this.toPublicUser(user);

            // Generate tokens
            const session = await this.generateSession(publicUser);

            return { user: publicUser, session };
        } catch (error) {
            console.error('Signup error:', error);
            return { error: 'Failed to create user' };
        }
    }

    async signIn(email: string, password: string): Promise<{ user: PublicUser; session: Session } | { error: string }> {
        try {
            // Get user by email
            const user = await this.db.getUserByEmail(email);
            if (!user) {
                return { error: 'Invalid email or password' };
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return { error: 'Invalid email or password' };
            }

            const publicUser = this.toPublicUser(user);

            // Generate tokens
            const session = await this.generateSession(publicUser);

            return { user: publicUser, session };
        } catch (error) {
            console.error('Signin error:', error);
            return { error: 'Failed to sign in' };
        }
    }

    async verifyToken(token: string): Promise<PublicUser | null> {
        try {
            const decoded = this.fastify.jwt.verify(token) as { userId: string; email: string };
            const user = await this.db.getUserById(decoded.userId);

            if (!user) {
                return null;
            }

            return this.toPublicUser(user);
        } catch {
            return null;
        }
    }

    async refreshSession(refreshToken: string): Promise<{ user: PublicUser; session: Session } | { error: string }> {
        try {
            const decoded = this.fastify.jwt.verify(refreshToken) as { userId: string; email: string; type: string };

            if (decoded.type !== 'refresh') {
                return { error: 'Invalid refresh token' };
            }

            const user = await this.db.getUserById(decoded.userId);
            if (!user) {
                return { error: 'User not found' };
            }

            const publicUser = this.toPublicUser(user);
            const session = await this.generateSession(publicUser);

            return { user: publicUser, session };
        } catch {
            return { error: 'Invalid refresh token' };
        }
    }

    private async generateSession(user: PublicUser): Promise<Session> {
        const accessTokenExpiry = 60 * 60; // 1 hour
        const refreshTokenExpiry = 60 * 60 * 24 * 30; // 30 days

        const accessToken = this.fastify.jwt.sign(
            { userId: user.id, email: user.email, type: 'access' },
            { expiresIn: accessTokenExpiry }
        );

        const refreshToken = this.fastify.jwt.sign(
            { userId: user.id, email: user.email, type: 'refresh' },
            { expiresIn: refreshTokenExpiry }
        );

        const expiresAt = Math.floor(Date.now() / 1000) + accessTokenExpiry;

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: accessTokenExpiry,
            expires_at: expiresAt,
            token_type: 'Bearer',
            user,
        };
    }
}
