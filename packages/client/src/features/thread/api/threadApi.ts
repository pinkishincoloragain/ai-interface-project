import { Thread } from '@/features';
import type { ChatMessage } from '@/entities/message';

const API_BASE = '/api';

export interface ThreadWithMessages extends Thread {
    messages: ChatMessage[];
}

export interface ThreadsResponse {
    threads: Thread[];
}

export interface ThreadResponse {
    thread: Thread;
}

export interface ThreadMessagesResponse {
    thread: ThreadWithMessages;
}

export interface CreateThreadRequest {
    title?: string;
}

export interface UpdateThreadRequest {
    title: string;
}

export const threadApi = {
    getThreads: async (): Promise<ThreadsResponse> => {
        const response = await fetch(`${API_BASE}/threads`);
        if (!response.ok) {
            throw new Error('Failed to fetch threads');
        }
        return response.json();
    },

    getThread: async (threadId: string): Promise<ThreadResponse> => {
        const response = await fetch(`${API_BASE}/threads/${threadId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch thread');
        }
        return response.json();
    },

    getThreadMessages: async (threadId: string): Promise<ThreadMessagesResponse> => {
        const response = await fetch(`${API_BASE}/threads/${threadId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch thread messages');
        }
        return response.json();
    },

    createThread: async (data: CreateThreadRequest = {}): Promise<ThreadResponse> => {
        const response = await fetch(`${API_BASE}/threads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error('Failed to create thread');
        }
        return response.json();
    },

    updateThread: async (threadId: string, data: UpdateThreadRequest): Promise<ThreadResponse> => {
        const response = await fetch(`${API_BASE}/threads/${threadId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error('Failed to update thread');
        }
        return response.json();
    },

    deleteThread: async (threadId: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/threads/${threadId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete thread');
        }
    },
};
