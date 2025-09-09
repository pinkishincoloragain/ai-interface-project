export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string;
    status?: 'sending' | 'success' | 'error';
}

export interface MessageCreateParams {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
