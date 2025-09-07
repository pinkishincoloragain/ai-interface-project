import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { ChatCompletionRequest } from '../../../shared/src/types/chat';
import { openaiService } from '../services/openai.js';
import { fallbackService } from '../services/fallback.js';
import { threadManager } from '../services/threadManager.js';

export function registerSSERoutes(fastify: FastifyInstance) {
    // SSE 라우트
    fastify.get('/api/sse', (request, reply) => {
        reply.sse({
            data: JSON.stringify({ message: 'SSE 연결이 설정되었습니다.' }),
        });

        // 연결 종료를 위해 setTimeout 추가 (옵션)
        setTimeout(() => {
            reply.sse({ data: '[DONE]' });
        }, 1000);
    });

    // SSE를 통한 채팅 응답
    fastify.post<{ Body: ChatCompletionRequest }>('/api/chat/sse', async (request, reply) => {
        try {
            const { messages, conversationId, messageId: providedMessageId } = request.body;
            const messageId = providedMessageId || uuidv4();
            let currentThreadId = conversationId;

            // 헤더 설정
            reply.raw.setHeader('Content-Type', 'text/event-stream');
            reply.raw.setHeader('Cache-Control', 'no-cache');
            reply.raw.setHeader('Connection', 'keep-alive');

            // 스레드가 없으면 새로 생성
            if (!currentThreadId) {
                const newThread = threadManager.createThread(messages[0]?.content || 'New conversation');
                currentThreadId = newThread.id;
            }

            // 사용자 메시지를 스레드에 추가
            const lastUserMessage = messages[messages.length - 1];
            threadManager.addMessageToThread(currentThreadId, lastUserMessage);

            let fullContent = '';

            if (openaiService.isInitialized()) {
                try {
                    // OpenAI 스트리밍 사용
                    const stream = await openaiService.createStreamingChatCompletion(
                        messages.map((msg) => ({ role: msg.role, content: msg.content }))
                    );

                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            fullContent += content;

                            const responseChunk = {
                                id: messageId,
                                content: fullContent,
                                role: 'assistant' as const,
                                conversationId: currentThreadId,
                                isDone: false,
                            };

                            reply.sse({
                                event: 'message',
                                data: JSON.stringify(responseChunk),
                            });
                        }
                    }
                } catch (openaiError) {
                    fastify.log.warn('OpenAI streaming failed, falling back to mock response:', openaiError);

                    // OpenAI 실패 시 폴백
                    const fallbackMessages = [{ role: lastUserMessage.role, content: lastUserMessage.content }];
                    const fallbackStream = fallbackService.createMockStreamingCompletion(fallbackMessages);
                    for await (const chunk of fallbackStream) {
                        fullContent += chunk.content;

                        const responseChunk = {
                            id: messageId,
                            content: fullContent,
                            role: 'assistant' as const,
                            conversationId: currentThreadId,
                            isDone: chunk.isDone,
                        };

                        reply.sse({
                            event: 'message',
                            data: JSON.stringify(responseChunk),
                        });

                        if (chunk.isDone) break;
                    }
                }
            } else {
                // OpenAI가 초기화되지 않았으면 폴백 사용
                const fallbackMessages = [{ role: lastUserMessage.role, content: lastUserMessage.content }];
                const fallbackStream = fallbackService.createMockStreamingCompletion(fallbackMessages);
                for await (const chunk of fallbackStream) {
                    fullContent += chunk.content;

                    const responseChunk = {
                        id: messageId,
                        content: fullContent,
                        role: 'assistant' as const,
                        conversationId: currentThreadId,
                        isDone: chunk.isDone,
                    };

                    reply.sse({
                        event: 'message',
                        data: JSON.stringify(responseChunk),
                    });

                    if (chunk.isDone) break;
                }
            }

            // 완료된 메시지를 스레드에 추가
            const finalMessage = {
                id: messageId,
                role: 'assistant' as const,
                content: fullContent,
                createdAt: new Date().toISOString(),
            };
            threadManager.addMessageToThread(currentThreadId, finalMessage);

            // 완료 이벤트 전송
            const finalChunk = {
                id: messageId,
                content: fullContent,
                role: 'assistant' as const,
                conversationId: currentThreadId,
                isDone: true,
            };

            reply.sse({
                event: 'message',
                data: JSON.stringify(finalChunk),
            });

            reply.sse({
                event: 'done',
                data: JSON.stringify({ conversationId: currentThreadId }),
            });

            // 연결 종료 신호
            reply.sse({ data: '[DONE]' });
        } catch (err) {
            fastify.log.error(err);
            reply.sse({
                event: 'error',
                data: JSON.stringify({ error: 'SSE 처리 중 오류가 발생했습니다.' }),
            });
            reply.sse({ data: '[DONE]' });
        }
    });
}
