import { v4 as uuidv4 } from 'uuid';
import { db, openai, fallback } from '../services/index';
import { getUserFromRequest } from '../utils/auth';
import type { Router, LambdaRequest } from '../types';

export function streamRoutes(router: Router) {
    // Note: Lambda doesn't support true streaming, so this is a simplified version
    // For true streaming, you'd need to use API Gateway WebSocket or implement Server-Sent Events

    router.register('POST', '/api/chat/stream', async (req: LambdaRequest) => {
        try {
            const {
                messages,
                conversationId,
                messageId: providedMessageId,
            } = req.body as {
                messages: { role: string; content: string }[];
                conversationId?: string;
                messageId?: string;
            };

            // Get authenticated user
            let user;
            try {
                user = await getUserFromRequest(req);
            } catch {
                return {
                    statusCode: 401,
                    body: { error: 'Unauthorized' },
                };
            }

            const messageId = providedMessageId || uuidv4();
            let convoId = conversationId;

            // If no conversation ID, create a new thread
            if (!convoId) {
                const firstUserMessage = messages.find((m: { role: string; content?: string }) => m.role === 'user');
                const threadTitle = firstUserMessage?.content?.slice(0, 50) || 'New Chat';

                const newThread = await db.createThread(user.id, threadTitle);
                convoId = newThread.id;
            }

            // Save user message to database
            const lastUserMessage = messages[messages.length - 1];
            if (lastUserMessage && lastUserMessage.role === 'user') {
                try {
                    await db.createMessage(convoId, user.id, lastUserMessage.role, lastUserMessage.content);
                } catch {
                    // Error saving user message
                }
            }

            let assistantResponse = '';

            // Generate response
            if (!openai.isInitialized()) {
                // Fallback service
                const fallbackMessages = messages.map((msg: { role: string; content: string }) => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content,
                }));

                const warningMessage = '⚠️ OpenAI API가 설정되지 않았습니다.\n\n';
                assistantResponse += warningMessage;

                // Simulate streaming with fallback response
                const fallbackResponse = await fallback.createMockChatCompletion(fallbackMessages);
                assistantResponse += fallbackResponse.content;

                const setupMessage =
                    '\n\n💡 실제 AI 응답을 받으려면:\n1. Secrets Manager에서 API 키를 설정하세요\n2. Lambda를 재배포하세요';
                assistantResponse += setupMessage;
            } else {
                // OpenAI API call (non-streaming for Lambda compatibility)
                const openaiMessages = messages.map((msg: { role: string; content: string }) => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content,
                }));

                const response = await openai.createChatCompletion(openaiMessages);
                if (response?.content) {
                    assistantResponse = response.content;
                }
            }

            // Save assistant response
            if (assistantResponse.trim()) {
                try {
                    await db.upsertMessage(messageId, convoId, user.id, 'assistant', assistantResponse);
                } catch {
                    // Error saving assistant response
                }
            }

            // Return the complete response (simulating the end of a stream)
            const streamChunk = {
                id: messageId,
                content: assistantResponse,
                role: 'assistant',
                conversationId: convoId!,
                isDone: true,
            };

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: streamChunk,
            };
        } catch (err) {
            console.error('Stream error:', err);
            return {
                statusCode: 500,
                body: { error: '스트리밍 처리 중 오류가 발생했습니다.' },
            };
        }
    });
}
