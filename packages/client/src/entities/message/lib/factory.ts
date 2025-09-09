import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, MessageCreateParams } from '../model/types';

export class MessageFactory {
    static create(params: MessageCreateParams): ChatMessage {
        return {
            id: uuidv4(),
            role: params.role,
            content: params.content,
            createdAt: new Date().toISOString(),
            status: params.role === 'user' ? 'success' : 'sending',
        };
    }

    static createUserMessage(content: string): ChatMessage {
        return this.create({ role: 'user', content });
    }

    static createAssistantMessage(content: string = ''): ChatMessage {
        return this.create({ role: 'assistant', content });
    }

    static createSystemMessage(content: string): ChatMessage {
        return this.create({ role: 'system', content });
    }
}
