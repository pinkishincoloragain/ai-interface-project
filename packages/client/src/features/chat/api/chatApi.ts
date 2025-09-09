import { chatApiClient } from './client';
import type { ChatMessage } from '@/entities/message';

export interface ChatCompletionResponse {
    id: string;
    message: ChatMessage;
    conversationId: string;
}

export const chatApi = {
    sendMessage: chatApiClient.sendMessage.bind(chatApiClient),
    saveMessage: chatApiClient.saveMessage.bind(chatApiClient),
};

// Legacy support
export const sendChatMessage = async (content: string, conversationId?: string): Promise<string> => {
    const messages: ChatMessage[] = [
        {
            id: Date.now().toString(),
            role: 'user',
            content,
            createdAt: new Date().toISOString(),
            status: 'success',
        },
    ];

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages, conversationId }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ChatCompletionResponse = await response.json();
        return data.message.content;
    } catch (error) {
        console.error('Chat API error:', error);
        throw error;
    }
};

export const simulateApiCall = async (content: string): Promise<string> => sendChatMessage(content);
