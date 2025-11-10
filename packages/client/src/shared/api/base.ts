import { sessionStorage } from '@/shared/lib/sessionStorage';
import { createAuthorizationHeader } from '@/shared/lib/headers';

export abstract class BaseApiClient {
    protected apiBase: string;

    constructor() {
        // Use AWS Lambda API Gateway endpoint
        this.apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    }

    protected async getAuthHeaders(): Promise<Record<string, string>> {
        const session = sessionStorage.getSession();

        if (!session || !sessionStorage.isSessionValid(session)) {
            throw new Error('Not authenticated');
        }

        return {
            'Content-Type': 'application/json',
            Authorization: createAuthorizationHeader(session.access_token),
        };
    }

    protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const headers = await this.getAuthHeaders();

        const response = await fetch(`${this.apiBase}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers },
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    protected async streamRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
        const headers = await this.getAuthHeaders();

        const response = await fetch(`${this.apiBase}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers },
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response;
    }
}
