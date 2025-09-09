import { BaseApiClient } from '@/shared/api';
import type { Thread, ThreadUpdateParams } from '@/entities/thread';

interface ThreadsResponse {
    threads: Thread[];
}

interface ThreadResponse {
    thread: Thread;
}

interface CreateThreadResponse {
    thread: Thread;
}

export class ThreadApiClient extends BaseApiClient {
    async getThreads(): Promise<ThreadsResponse> {
        return this.request<ThreadsResponse>('/api/threads');
    }

    async getThread(threadId: string): Promise<ThreadResponse> {
        return this.request<ThreadResponse>(`/api/threads/${threadId}`);
    }

    async getThreadMessages(threadId: string): Promise<ThreadResponse> {
        return this.request<ThreadResponse>(`/api/threads/${threadId}/messages`);
    }

    async createThread(data: { title: string }): Promise<CreateThreadResponse> {
        return this.request<CreateThreadResponse>('/api/threads', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateThread(threadId: string, data: ThreadUpdateParams): Promise<ThreadResponse> {
        return this.request<ThreadResponse>(`/api/threads/${threadId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteThread(threadId: string): Promise<void> {
        await this.request<void>(`/api/threads/${threadId}`, {
            method: 'DELETE',
        });
    }
}

export const threadApiClient = new ThreadApiClient();
