import { MessageFactory, type ChatMessage } from '@/entities/message';
import { useChatStore } from '../model/store';

export interface MessageOperations {
    createUserMessage: (content: string) => ChatMessage;
    createAssistantPlaceholder: () => ChatMessage;
    addMessage: (message: ChatMessage) => void;
    updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
    getSuccessfulMessages: () => ChatMessage[];
}

/**
 * Service responsible for message CRUD operations
 * Following SRP: Only handles message state management
 */
export class MessageService implements MessageOperations {
    createUserMessage(content: string): ChatMessage {
        return MessageFactory.createUserMessage(content);
    }

    createAssistantPlaceholder(): ChatMessage {
        return MessageFactory.createAssistantMessage('');
    }

    addMessage(message: ChatMessage): void {
        useChatStore.getState().addMessage(message);
    }

    updateMessage(messageId: string, updates: Partial<ChatMessage>): void {
        useChatStore.getState().updateMessage(messageId, updates);
    }

    updateMessageContent(messageId: string, content: string, isDone: boolean): void {
        this.updateMessage(messageId, {
            content,
            status: isDone ? 'success' : 'sending',
        });
    }

    markMessageAsError(messageId: string, errorMessage?: string): void {
        const message = this.findMessage(messageId);
        const updates: Partial<ChatMessage> = {
            status: 'error',
        };

        // Only override content if the message is empty or if an explicit error message is provided
        if (!message?.content || !message.content.trim() || errorMessage) {
            updates.content = errorMessage || '오류가 발생했습니다.';
        }

        this.updateMessage(messageId, updates);
    }

    markMessageAsSuccess(messageId: string): void {
        this.updateMessage(messageId, {
            status: 'success',
        });
    }

    markMessageAsStopped(messageId: string): void {
        const message = this.findMessage(messageId);
        if (message && message.status === 'sending') {
            // Keep existing content and mark as success (completed)
            // The server will handle saving the partial content when the request is aborted
            this.updateMessage(messageId, {
                status: 'success',
            });
        } else if (!message) {
            console.warn(`Attempted to mark non-existent message as stopped: ${messageId}`);
        }
    }

    getSuccessfulMessages(): ChatMessage[] {
        return useChatStore.getState().messages.filter((m) => m.status === 'success');
    }

    findMessage(messageId: string): ChatMessage | undefined {
        return useChatStore.getState().messages.find((m) => m.id === messageId);
    }

    removeMessage(messageId: string): void {
        useChatStore.getState().removeMessage(messageId);
    }
}

// Singleton instance for the application
export const messageService = new MessageService();
