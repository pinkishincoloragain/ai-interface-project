import type { ChatMessage } from '../../entities/message';

export interface SSEMessageData {
    id: string;
    content: string;
    role: 'assistant';
    conversationId: string;
    isDone: boolean;
}

export interface ChatCompletionRequest {
    messages: ChatMessage[];
    conversationId?: string;
    messageId?: string;
    model?: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}
