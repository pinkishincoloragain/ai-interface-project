import type { ChatMessage } from '../model/types';

export class MessageValidator {
    static isValidMessage(message: ChatMessage): boolean {
        return (
            Boolean(message.id) &&
            ['user', 'assistant', 'system'].includes(message.role) &&
            typeof message.content === 'string' &&
            Boolean(message.createdAt)
        );
    }

    static isUserMessage(message: ChatMessage): boolean {
        return message.role === 'user';
    }

    static isAssistantMessage(message: ChatMessage): boolean {
        return message.role === 'assistant';
    }

    static isSystemMessage(message: ChatMessage): boolean {
        return message.role === 'system';
    }

    static isStreamingMessage(message: ChatMessage): boolean {
        return message.status === 'sending';
    }

    static isCompletedMessage(message: ChatMessage): boolean {
        return message.status === 'success';
    }

    static hasError(message: ChatMessage): boolean {
        return message.status === 'error';
    }
}
