import type { ChatMessage } from '@/entities/message';
import { v4 as uuidv4 } from 'uuid';

export class ChatStore {
    private messages: ChatMessage[] = [];
    private listeners: Array<(messages: ChatMessage[]) => void> = [];

    getMessages(): ChatMessage[] {
        return [...this.messages];
    }

    addMessage(content: string, role: 'user' | 'assistant' = 'user'): string {
        const newMessage: ChatMessage = {
            id: uuidv4(),
            role,
            content,
            createdAt: new Date().toISOString(),
            status: 'sending',
        };

        this.messages = [...this.messages, newMessage];
        this.notifyListeners();

        return newMessage.id;
    }

    updateMessageStatus(messageId: string, status: 'sending' | 'success' | 'error'): void {
        this.messages = this.messages.map((msg) => (msg.id === messageId ? { ...msg, status } : msg));
        this.notifyListeners();
    }

    subscribe(listener: (messages: ChatMessage[]) => void): () => void {
        this.listeners.push(listener);

        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach((listener) => listener(this.getMessages()));
    }
}

export const chatStore = new ChatStore();
