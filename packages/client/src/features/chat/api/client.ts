import { BaseApiClient, type ChatCompletionRequest } from '@/shared/api';
import type { ChatMessage } from '@/entities/message';

export class ChatApiClient extends BaseApiClient {
    async sendMessage(messages: ChatMessage[], conversationId?: string, signal?: AbortSignal): Promise<Response> {
        const requestBody: ChatCompletionRequest = {
            messages,
            conversationId,
        };

        return this.streamRequest(
            '/api/chat/stream',
            {
                method: 'POST',
                body: JSON.stringify(requestBody),
            },
            signal
        );
    }
}

export const chatApiClient = new ChatApiClient();
