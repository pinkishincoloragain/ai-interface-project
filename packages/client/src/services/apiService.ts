// Update API service to use CloudFront/API Gateway endpoints
import { createAuthorizationHeader } from '@/shared/lib/headers';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;

        const config: RequestInit = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    async get<T>(endpoint: string, token?: string): Promise<T> {
        const headers: HeadersInit = {};
        if (token) {
            headers.Authorization = createAuthorizationHeader(token);
        }

        return this.request<T>(endpoint, {
            method: 'GET',
            headers,
        });
    }

    async post<T>(endpoint: string, data?: unknown, token?: string): Promise<T> {
        const headers: HeadersInit = {};
        if (token) {
            headers.Authorization = createAuthorizationHeader(token);
        }

        return this.request<T>(endpoint, {
            method: 'POST',
            headers,
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: unknown, token?: string): Promise<T> {
        const headers: HeadersInit = {};
        if (token) {
            headers.Authorization = createAuthorizationHeader(token);
        }

        return this.request<T>(endpoint, {
            method: 'PUT',
            headers,
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string, token?: string): Promise<T> {
        const headers: HeadersInit = {};
        if (token) {
            headers.Authorization = createAuthorizationHeader(token);
        }

        return this.request<T>(endpoint, {
            method: 'DELETE',
            headers,
        });
    }
}

export const apiService = new ApiService();
