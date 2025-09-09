import { supabase } from '@/shared';

export abstract class BaseApiClient {
    protected apiBase: string;

    constructor() {
        this.apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    }

    protected async getAuthHeaders(): Promise<Record<string, string>> {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            throw new Error('Not authenticated');
        }

        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
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
