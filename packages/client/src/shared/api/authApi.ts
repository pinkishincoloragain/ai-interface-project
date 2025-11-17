import { User, Session } from '@/shared/types/auth';
import { createAuthorizationHeader } from '@/shared/lib/headers';

export interface AuthResponse {
    user: User | null;
    session: Session | null;
    error?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    email: string;
    password: string;
}

export class AuthApiClient {
    private apiBase: string;

    constructor() {
        this.apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    }

    async login(email: string, password: string): Promise<AuthResponse> {
        try {
            const response = await fetch(`${this.apiBase}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { user: null, session: null, error: data.error || 'Login failed' };
            }

            return { user: data.user, session: data.session };
        } catch (error) {
            return {
                user: null,
                session: null,
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }

    async signup(email: string, password: string): Promise<AuthResponse> {
        try {
            const response = await fetch(`${this.apiBase}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { user: null, session: null, error: data.error || 'Signup failed' };
            }

            return { user: data.user, session: data.session };
        } catch (error) {
            return {
                user: null,
                session: null,
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }

    async logout(accessToken: string): Promise<{ error?: string }> {
        try {
            const response = await fetch(`${this.apiBase}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: createAuthorizationHeader(accessToken),
                },
            });

            if (!response.ok) {
                const data = await response.json();
                return { error: data.error || 'Logout failed' };
            }

            return {};
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }

    async getUser(accessToken: string): Promise<{ user: User | null; error?: string }> {
        try {
            const response = await fetch(`${this.apiBase}/api/auth/user`, {
                method: 'GET',
                headers: {
                    Authorization: createAuthorizationHeader(accessToken),
                },
            });

            const data = await response.json();

            if (!response.ok) {
                return { user: null, error: data.error || 'Failed to get user' };
            }

            return { user: data.user };
        } catch (error) {
            return {
                user: null,
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }

    async refreshSession(refreshToken: string): Promise<AuthResponse> {
        try {
            const response = await fetch(`${this.apiBase}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { user: null, session: null, error: data.error || 'Refresh failed' };
            }

            return { user: data.user, session: data.session };
        } catch (error) {
            return {
                user: null,
                session: null,
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }
}

export const authApiClient = new AuthApiClient();
