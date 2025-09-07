import { BaseApiClient, type ChatCompletionRequest } from '@/shared/api';
import type { ChatMessage } from '@/entities/message';

export class ChatApiClient extends BaseApiClient {
    async sendMessage(
        messages: ChatMessage[],
        conversationId?: string,
        messageId?: string,
        abortSignal?: AbortSignal
    ): Promise<Response> {
        const requestBody: ChatCompletionRequest = {
            messages,
            conversationId,
            messageId,
        };

        return this.streamRequest('/api/chat/stream', {
            method: 'POST',
            body: JSON.stringify(requestBody),
            signal: abortSignal,
        });
    }

    async saveMessage(
        threadId: string,
        messageId: string,
        content: string,
        role: 'user' | 'assistant'
    ): Promise<{ success: boolean; message: ChatMessage }> {
        return this.request('/api/messages/save', {
            method: 'POST',
            body: JSON.stringify({
                threadId,
                messageId,
                content,
                role,
            }),
        });
    }
}

export const chatApiClient = new ChatApiClient();
