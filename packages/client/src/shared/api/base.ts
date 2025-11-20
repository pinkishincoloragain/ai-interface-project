import { sessionStorage } from '@/shared/lib/sessionStorage';
import { createAuthorizationHeader } from '@/shared/lib/headers';
import { authErrorHandler } from '@/shared/lib/authErrorHandler';

export abstract class BaseApiClient {
    protected apiBase: string;
    protected streamingBase: string;

    constructor() {
        // Use AWS Lambda API Gateway endpoint
        this.apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        // Use Lambda Function URL for real-time streaming
        this.streamingBase = import.meta.env.VITE_STREAMING_URL || this.apiBase;
    }

    protected async getAuthHeaders(): Promise<Record<string, string>> {
        const session = sessionStorage.getSession();

        if (!session || !sessionStorage.isSessionValid(session)) {
            const error = new Error('Not authenticated');
            authErrorHandler.handleAuthError();
            throw error;
        }

        return {
            'Content-Type': 'application/json',
            Authorization: createAuthorizationHeader(session.access_token),
        };
    }

    protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        try {
            const headers = await this.getAuthHeaders();

            const response = await fetch(`${this.apiBase}${endpoint}`, {
                ...options,
                headers: { ...headers, ...options.headers },
            });

            if (!response.ok) {
                // Check for auth errors from server
                if (response.status === 401 || response.status === 403) {
                    authErrorHandler.handleAuthError();
                }
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            // Handle auth errors that might not be caught above
            authErrorHandler.checkAndHandle(error);
            throw error;
        }
    }

    protected async streamRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
        try {
            const headers = await this.getAuthHeaders();

            // Use streaming URL for real-time streaming support
            const response = await fetch(`${this.streamingBase}${endpoint}`, {
                ...options,
                headers: { ...headers, ...options.headers },
            });

            if (!response.ok) {
                // Check for auth errors from server
                if (response.status === 401 || response.status === 403) {
                    authErrorHandler.handleAuthError();
                }
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return response;
        } catch (error) {
            // Handle auth errors that might not be caught above
            authErrorHandler.checkAndHandle(error);
            throw error;
        }
    }
}
