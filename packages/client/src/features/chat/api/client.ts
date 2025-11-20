import { BaseApiClient, type ChatCompletionRequest } from '@/shared/api';
import type { ChatMessage } from '@/entities/message';

export class ChatApiClient extends BaseApiClient {
    async sendMessage(
        messages: ChatMessage[],
        conversationId?: string,
        messageId?: string,
        abortSignal?: AbortSignal,
        model?: string
    ): Promise<Response> {
        const requestBody: ChatCompletionRequest = {
            messages,
            conversationId,
            messageId,
            model,
        };

        // Lambda Function URLs use root path, not /api/chat/stream
        // Local server uses /api/chat/stream
        const streamingUrl = import.meta.env.VITE_STREAMING_URL;
        const isLambdaFunctionUrl = streamingUrl && streamingUrl.includes('lambda-url');
        const endpoint = isLambdaFunctionUrl ? '/' : '/api/chat/stream';

        return this.streamRequest(endpoint, {
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
