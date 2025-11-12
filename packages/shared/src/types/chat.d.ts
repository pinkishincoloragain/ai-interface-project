export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'sending' | 'success' | 'error';

export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    createdAt: string;
    status?: MessageStatus;
}

export interface ChatConversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}

export interface ChatCompletionRequest {
    messages: ChatMessage[];
    conversationId?: string;
    messageId?: string;
    model?: string;
}

export interface ChatCompletionResponse {
    id: string;
    message: ChatMessage;
    conversationId: string;
}

export interface ChatStreamChunk {
    id: string;
    content: string;
    role: MessageRole;
    conversationId: string;
    isDone: boolean;
}
