import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { initializeServices, db, openai, fallback } from './services';
import { getUserFromRequest } from './utils/auth';
import { logger } from './utils/logger';

// Global service initialization
let servicesInitialized = false;

// Declare the awslambda global for Lambda Response Streaming
declare const awslambda: {
    streamifyResponse: (
        handler: (event: APIGatewayProxyEvent, responseStream: NodeJS.WritableStream, context: Context) => Promise<void>
    ) => any;
    HttpResponseStream: {
        from: (responseStream: NodeJS.WritableStream, metadata: any) => NodeJS.WritableStream;
    };
};

/**
 * Lambda Response Streaming Handler
 * This handler enables true real-time streaming of SSE events
 * Note: This only works with Lambda Function URLs, not API Gateway REST API
 */
export const streamingHandler = awslambda.streamifyResponse(
    async (event: APIGatewayProxyEvent, responseStream: NodeJS.WritableStream, context: Context): Promise<void> => {
        const startTime = Date.now();
        const correlationId = randomUUID();
        const requestId = context.awsRequestId;

        logger.setRequestId(requestId);
        logger.setCorrelationId(correlationId);

        // Initialize services on cold start
        if (!servicesInitialized) {
            logger.info('Initializing services on cold start');
            await initializeServices();
            servicesInitialized = true;
        }

        try {
            // Parse request body
            const body = JSON.parse(event.body || '{}');
            const { messages, conversationId, messageId: providedMessageId } = body;

            logger.info('Stream request received', {
                messageCount: messages?.length,
                hasConversationId: !!conversationId,
            });

            // Get authenticated user
            let user;
            try {
                const headers = Object.keys(event.headers || {}).reduce(
                    (acc, key) => {
                        acc[key.toLowerCase()] = event.headers[key];
                        return acc;
                    },
                    {} as Record<string, string | undefined>
                );
                user = await getUserFromRequest({
                    method: event.httpMethod,
                    path: event.path,
                    headers,
                    body,
                    queryStringParameters: event.queryStringParameters || {},
                    context,
                });
                logger.setUserId(user.id);
            } catch (authError) {
                logger.security('Unauthorized stream request', { error: authError });

                // Set CORS headers for error response
                const errorMetadata = {
                    statusCode: 401,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers':
                            'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
                    },
                };
                responseStream = awslambda.HttpResponseStream.from(responseStream, errorMetadata);
                responseStream.write(JSON.stringify({ error: 'Unauthorized' }));
                responseStream.end();
                return;
            }

            const messageId = providedMessageId || randomUUID();
            let convoId = conversationId;

            // Create new thread if needed
            if (!convoId) {
                const firstUserMessage = messages.find((m: { role: string; content?: string }) => m.role === 'user');
                const threadTitle = firstUserMessage?.content?.slice(0, 50) || 'New Chat';

                logger.info('Creating new thread', { userId: user.id, title: threadTitle });
                const newThread = await db.createThread(user.id, threadTitle);
                convoId = newThread.id;
                logger.business('New conversation started', { conversationId: convoId, userId: user.id });
            }

            // Save user message
            const lastUserMessage = messages[messages.length - 1];
            if (lastUserMessage && lastUserMessage.role === 'user') {
                try {
                    await db.createMessage(convoId, user.id, lastUserMessage.role, lastUserMessage.content);
                } catch {
                    // Error saving user message
                }
            }

            // Write response metadata (headers) with full CORS support
            const metadata = {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    Connection: 'keep-alive',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers':
                        'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
                    'Access-Control-Expose-Headers': 'X-Amz-Request-Id',
                },
            };
            responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

            let assistantResponse = '';

            // Generate response with streaming
            const aiStart = Date.now();
            if (!openai.isInitialized()) {
                logger.warn('OpenAI not initialized, using fallback service');

                const fallbackMessages = messages.map((msg: { role: string; content: string }) => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content,
                }));

                // Stream warning message
                const warningMessage = '⚠️ OpenAI API가 설정되지 않았습니다.\n\n';
                assistantResponse += warningMessage;
                responseStream.write(
                    `data: ${JSON.stringify({
                        id: messageId,
                        content: assistantResponse,
                        role: 'assistant',
                        conversationId: convoId,
                        isDone: false,
                    })}\n\n`
                );

                // Stream fallback response
                const fallbackResponse = await fallback.createMockChatCompletion(fallbackMessages);
                assistantResponse += fallbackResponse.content;
                responseStream.write(
                    `data: ${JSON.stringify({
                        id: messageId,
                        content: assistantResponse,
                        role: 'assistant',
                        conversationId: convoId,
                        isDone: false,
                    })}\n\n`
                );

                const setupMessage =
                    '\n\n💡 실제 AI 응답을 받으려면:\n1. Secrets Manager에서 API 키를 설정하세요\n2. Lambda를 재배포하세요';
                assistantResponse += setupMessage;
                responseStream.write(
                    `data: ${JSON.stringify({
                        id: messageId,
                        content: assistantResponse,
                        role: 'assistant',
                        conversationId: convoId,
                        isDone: false,
                    })}\n\n`
                );
            } else {
                logger.info('Generating AI response', { conversationId: convoId, messageCount: messages.length });

                const openaiMessages = messages.map((msg: { role: string; content: string }) => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content,
                }));

                // Stream chunks as they arrive from OpenAI
                for await (const chunk of openai.createStreamingChatCompletion(openaiMessages)) {
                    const delta = chunk.choices[0]?.delta?.content;
                    if (delta) {
                        assistantResponse += delta;

                        // Write each chunk to the stream immediately
                        responseStream.write(
                            `data: ${JSON.stringify({
                                id: messageId,
                                content: assistantResponse,
                                role: 'assistant',
                                conversationId: convoId,
                                isDone: false,
                            })}\n\n`
                        );
                    }
                }

                logger.business('AI response generated', {
                    conversationId: convoId,
                    responseLength: assistantResponse.length,
                    aiDuration: Date.now() - aiStart,
                });
            }

            // Save assistant response
            if (assistantResponse.trim()) {
                try {
                    await db.upsertMessage(messageId, convoId, user.id, 'assistant', assistantResponse);
                } catch {
                    // Error saving assistant response
                }
            }

            // Send final done event
            responseStream.write(
                `data: ${JSON.stringify({
                    id: messageId,
                    content: assistantResponse,
                    role: 'assistant',
                    conversationId: convoId,
                    isDone: true,
                })}\n\n`
            );

            logger.performance('Stream request completed', Date.now() - startTime, {
                conversationId: convoId,
                messageId,
                responseLength: assistantResponse.length,
            });

            // End the stream
            responseStream.end();
        } catch (err) {
            const duration = Date.now() - startTime;
            logger.error('Streaming handler error', { duration }, err as Error);

            try {
                // Set CORS headers for error response
                const errorMetadata = {
                    statusCode: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers':
                            'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
                    },
                };
                responseStream = awslambda.HttpResponseStream.from(responseStream, errorMetadata);
                responseStream.write(JSON.stringify({ error: '스트리밍 처리 중 오류가 발생했습니다.' }));
                responseStream.end();
            } catch {
                // If we can't write error, just end the stream
                try {
                    responseStream.end();
                } catch {
                    // Stream already closed
                }
            }
        } finally {
            logger.clearContext();
        }
    }
);
