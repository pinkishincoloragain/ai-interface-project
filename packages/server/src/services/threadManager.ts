import { ChatMessage } from 'shared/types/chat';
import { v4 as uuidv4 } from 'uuid';

export interface ChatThread {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}

class ThreadManager {
    private threads: Map<string, ChatThread> = new Map();

    createThread(firstMessage?: string): ChatThread {
        const thread: ChatThread = {
            id: uuidv4(),
            title: firstMessage ? this.generateTitle(firstMessage) : 'New Chat',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        this.threads.set(thread.id, thread);
        return thread;
    }

    getThread(threadId: string): ChatThread | undefined {
        return this.threads.get(threadId);
    }

    getAllThreads(): ChatThread[] {
        return Array.from(this.threads.values()).sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }

    addMessageToThread(threadId: string, message: ChatMessage): boolean {
        const thread = this.threads.get(threadId);
        if (!thread) {
            return false;
        }

        thread.messages.push(message);
        thread.updatedAt = new Date().toISOString();

        // Update title based on first user message if it's still "New Chat"
        if (thread.title === 'New Chat' && message.role === 'user') {
            thread.title = this.generateTitle(message.content);
        }

        return true;
    }

    deleteThread(threadId: string): boolean {
        return this.threads.delete(threadId);
    }

    getOrCreateThread(threadId: string, defaultTitle: string = 'Recovered Chat'): ChatThread {
        let thread = this.threads.get(threadId);
        if (!thread) {
            // Create a new thread with the specific ID
            thread = {
                id: threadId,
                title: defaultTitle,
                messages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            this.threads.set(threadId, thread);
        }
        return thread;
    }

    updateThreadTitle(threadId: string, title: string): boolean {
        const thread = this.threads.get(threadId);
        if (!thread) {
            return false;
        }

        thread.title = title;
        thread.updatedAt = new Date().toISOString();
        return true;
    }

    private generateTitle(content: string): string {
        // Generate a title from the first message (max 50 chars)
        const title = content.trim().substring(0, 50);
        return title.length < content.trim().length ? title + '...' : title;
    }
}

export const threadManager = new ThreadManager();
