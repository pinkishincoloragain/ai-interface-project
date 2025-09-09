import { v4 as uuidv4 } from 'uuid';
import type { Thread, ThreadCreateParams } from '../model/types';

export class ThreadFactory {
    static create(params: ThreadCreateParams = {}): Thread {
        const now = new Date().toISOString();

        return {
            id: uuidv4(),
            title: params.title || 'New Chat',
            messages: params.messages || [],
            createdAt: now,
            updatedAt: now,
        };
    }

    static generateTitle(firstMessage: string, maxLength: number = 50): string {
        const trimmed = firstMessage.trim();
        const title = trimmed.substring(0, maxLength);
        return title.length < trimmed.length ? title + '...' : title;
    }
}
