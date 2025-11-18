import { randomUUID } from 'crypto';
import { db, openai, fallback } from '../services/index';
import { getUserFromRequest } from '../utils/auth';
import { logger } from '../utils/logger';
import type { Router, LambdaRequest } from '../types';

export function streamRoutes(router: Router) {
    // Note: Lambda doesn't support true streaming, so this is a simplified version
    // For true streaming, you'd need to use API Gateway WebSocket or implement Server-Sent Events

    router.register('POST', '/api/chat/stream', async (req: LambdaRequest) => {
        const startTime = Date.now();
        let convoId: string | undefined;
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

            logger.info('Stream request received', {
                messageCount: messages?.length,
                hasConversationId: !!conversationId,
                hasMessageId: !!providedMessageId,
            });

            // Get authenticated user
            let user;
            try {
                user = await getUserFromRequest(req);
                logger.setUserId(user.id);
            } catch (authError) {
                logger.security('Unauthorized stream request', { error: authError });
                return {
                    statusCode: 401,
                    body: { error: 'Unauthorized' },
                };
            }

            const messageId = providedMessageId || randomUUID();
            convoId = conversationId;

            // If no conversation ID, create a new thread
            if (!convoId) {
                const firstUserMessage = messages.find((m: { role: string; content?: string }) => m.role === 'user');
                const threadTitle = firstUserMessage?.content?.slice(0, 50) || 'New Chat';

                logger.info('Creating new thread', { userId: user.id, title: threadTitle });
                const newThread = await db.createThread(user.id, threadTitle);
                convoId = newThread.id;
                logger.business('New conversation started', { conversationId: convoId, userId: user.id });
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
            const aiStart = Date.now();
            if (!openai.isInitialized()) {
                logger.warn('OpenAI not initialized, using fallback service');
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
                logger.info('Generating AI response', { conversationId: convoId, messageCount: messages.length });
                // OpenAI API call (non-streaming for Lambda compatibility)
                const openaiMessages = messages.map((msg: { role: string; content: string }) => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content,
                }));

                const response = await openai.createChatCompletion(openaiMessages);
                if (response?.content) {
                    assistantResponse = response.content;
                    logger.business('AI response generated', {
                        conversationId: convoId,
                        responseLength: assistantResponse.length,
                        aiDuration: Date.now() - aiStart,
                    });
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

            // Return the complete response in SSE format (simulating the end of a stream)
            const streamChunk = {
                id: messageId,
                content: assistantResponse,
                role: 'assistant',
                conversationId: convoId!,
                isDone: true,
            };

            logger.performance('Stream request completed', Date.now() - startTime, {
                conversationId: convoId,
                messageId,
                responseLength: assistantResponse.length,
            });

            // Format as Server-Sent Events (SSE)
            // SSE format: data: <json>\n\n
            const sseData = `data: ${JSON.stringify(streamChunk)}\n\n`;

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    Connection: 'keep-alive',
                },
                body: sseData,
            };
        } catch (err) {
            const duration = Date.now() - startTime;
            logger.error('Stream processing error', { conversationId: convoId, duration }, err as Error);
            return {
                statusCode: 500,
                body: { error: '스트리밍 처리 중 오류가 발생했습니다.' },
            };
        }
    });
}
