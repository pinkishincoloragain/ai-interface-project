import { randomUUID } from 'crypto';
import { db, openai, fallback } from '../services/index';
import { getUserFromRequest } from '../utils/auth';
import { logger } from '../utils/logger';
import type { Router, LambdaRequest, ErrorWithMessage, ChatMessage } from '../types';

export function chatRoutes(router: Router) {
    // GET all threads
    router.register('GET', '/api/threads', async (req: LambdaRequest) => {
        try {
            const user = await getUserFromRequest(req);
            const threads = await db.getUserThreads(user.id);

            const formattedThreads = threads.map((thread) => ({
                ...thread,
                createdAt: thread.created_at,
                updatedAt: thread.updated_at,
            }));

            return {
                statusCode: 200,
                body: { threads: formattedThreads },
            };
        } catch (err: unknown) {
            const errorWithMessage = err as ErrorWithMessage;
            if (
                errorWithMessage.message === 'No authorization header' ||
                errorWithMessage.message === 'Invalid or expired token'
            ) {
                return {
                    statusCode: 401,
                    body: { error: 'Unauthorized' },
                };
            }
            logger.error('Get threads error', err);
            return {
                statusCode: 500,
                body: { error: 'Failed to get threads' },
            };
        }
    });

    // GET specific thread
    router.register('GET', '/api/threads/:id', async (req: LambdaRequest) => {
        try {
            const { id } = req.params || {};
            const user = await getUserFromRequest(req);
            const thread = await db.getThread(id, user.id);

            if (!thread) {
                return {
                    statusCode: 404,
                    body: { error: 'Thread not found' },
                };
            }

            return {
                statusCode: 200,
                body: { thread },
            };
        } catch (err: unknown) {
            const errorWithMessage = err as ErrorWithMessage;
            if (
                errorWithMessage.message === 'No authorization header' ||
                errorWithMessage.message === 'Invalid or expired token'
            ) {
                return {
                    statusCode: 401,
                    body: { error: 'Unauthorized' },
                };
            }
            logger.error('Get thread error', err);
            return {
                statusCode: 500,
                body: { error: 'Failed to get thread' },
            };
        }
    });

    // POST create new thread
    router.register('POST', '/api/threads', async (req: LambdaRequest) => {
        try {
            const user = await getUserFromRequest(req);
            const thread = await db.createThread(user.id, 'New Chat');

            return {
                statusCode: 200,
                body: { thread },
            };
        } catch (err: unknown) {
            const errorWithMessage = err as ErrorWithMessage;
            if (
                errorWithMessage.message === 'No authorization header' ||
                errorWithMessage.message === 'Invalid or expired token'
            ) {
                return {
                    statusCode: 401,
                    body: { error: 'Unauthorized' },
                };
            }
            logger.error('Create thread error', err);
            return {
                statusCode: 500,
                body: { error: 'Failed to create thread' },
            };
        }
    });

    // DELETE thread
    router.register('DELETE', '/api/threads/:id', async (req: LambdaRequest) => {
        try {
            const { id } = req.params || {};
            const user = await getUserFromRequest(req);
            const deleted = await db.deleteThread(id, user.id);

            if (!deleted) {
                return {
                    statusCode: 404,
                    body: { error: 'Thread not found' },
                };
            }

            return {
                statusCode: 200,
                body: { success: true },
            };
        } catch (err: unknown) {
            const errorWithMessage = err as ErrorWithMessage;
            if (
                errorWithMessage.message === 'No authorization header' ||
                errorWithMessage.message === 'Invalid or expired token'
            ) {
                return {
                    statusCode: 401,
                    body: { error: 'Unauthorized' },
                };
            }
            logger.error('Delete thread error', err);
            return {
                statusCode: 500,
                body: { error: 'Failed to delete thread' },
            };
        }
    });

    // GET thread messages
    router.register('GET', '/api/threads/:id/messages', async (req: LambdaRequest) => {
        try {
            const { id } = req.params || {};
            const user = await getUserFromRequest(req);
            const thread = await db.getThread(id, user.id);

            if (!thread) {
                return {
                    statusCode: 404,
                    body: { error: 'Thread not found' },
                };
            }

            const messages = await db.getThreadMessages(id, user.id);

            return {
                statusCode: 200,
                body: {
                    thread: {
                        ...thread,
                        messages: messages || [],
                    },
                },
            };
        } catch (err: unknown) {
            const errorWithMessage = err as ErrorWithMessage;
            if (
                errorWithMessage.message === 'No authorization header' ||
                errorWithMessage.message === 'Invalid or expired token'
            ) {
                return {
                    statusCode: 401,
                    body: { error: 'Unauthorized' },
                };
            }
            logger.error('Get thread messages error', err);
            return {
                statusCode: 500,
                body: { error: 'Failed to get thread messages' },
            };
        }
    });

    // PUT update thread title
    router.register('PUT', '/api/threads/:id', async (req: LambdaRequest) => {
        try {
            const { id } = req.params || {};
            const { title } = req.body as { title: string };
            const user = await getUserFromRequest(req);

            const updatedThread = await db.updateThread(id, user.id, { title });

            if (!updatedThread) {
                return {
                    statusCode: 404,
                    body: { error: 'Thread not found or failed to update' },
                };
            }

            return {
                statusCode: 200,
                body: { success: true, thread: updatedThread },
            };
        } catch (err: unknown) {
            const errorWithMessage = err as ErrorWithMessage;
            if (
                errorWithMessage.message === 'No authorization header' ||
                errorWithMessage.message === 'Invalid or expired token'
            ) {
                return {
                    statusCode: 401,
                    body: { error: 'Unauthorized' },
                };
            }
            logger.error('Update thread error', err);
            return {
                statusCode: 500,
                body: { error: 'Failed to update thread' },
            };
        }
    });

    // POST generate thread title from first message
    router.register('POST', '/api/threads/:id/generate-title', async (req: LambdaRequest) => {
        try {
            const { id } = req.params || {};
            const user = await getUserFromRequest(req);

            const thread = await db.getThread(id, user.id);
            if (!thread) {
                return {
                    statusCode: 404,
                    body: { error: 'Thread not found' },
                };
            }

            const messages = await db.getThreadMessages(id, user.id);
            const firstUserMessage = messages.find((m) => m.role === 'user');

            if (!firstUserMessage) {
                return {
                    statusCode: 404,
                    body: { error: 'No user message found in thread' },
                };
            }

            // Generate title using OpenAI
            let generatedTitle: string;
            try {
                generatedTitle = await openai.generateTitle(firstUserMessage.content);
            } catch {
                // Fallback to simple title generation
                const fallbackTitle = firstUserMessage.content.trim().substring(0, 47);
                generatedTitle =
                    fallbackTitle.length < firstUserMessage.content.trim().length
                        ? fallbackTitle + '...'
                        : fallbackTitle;
            }

            const updatedThread = await db.updateThread(id, user.id, { title: generatedTitle });

            if (!updatedThread) {
                return {
                    statusCode: 500,
                    body: { error: 'Failed to update thread title' },
                };
            }

            return {
                statusCode: 200,
                body: {
                    success: true,
                    title: generatedTitle,
                    thread: updatedThread,
                },
            };
        } catch (err: unknown) {
            const errorWithMessage = err as ErrorWithMessage;
            if (
                errorWithMessage.message === 'No authorization header' ||
                errorWithMessage.message === 'Invalid or expired token'
            ) {
                return {
                    statusCode: 401,
                    body: { error: 'Unauthorized' },
                };
            }
            logger.error('Generate title error', err);
            return {
                statusCode: 500,
                body: { error: 'Failed to generate thread title' },
            };
        }
    });

    // POST save partial message (for aborted/stopped messages)
    router.register('POST', '/api/messages/save', async (req: LambdaRequest) => {
        try {
            const { threadId, messageId, content, role } = req.body as {
                threadId: string;
                messageId: string;
                content: string;
                role: 'user' | 'assistant';
            };
            const user = await getUserFromRequest(req);

            const thread = await db.getThread(threadId, user.id);
            if (!thread) {
                return {
                    statusCode: 404,
                    body: { error: 'Thread not found' },
                };
            }

            const savedMessage = await db.upsertMessage(messageId, threadId, user.id, role, content);

            return {
                statusCode: 200,
                body: { success: true, message: savedMessage },
            };
        } catch (err: unknown) {
            const errorWithMessage = err as ErrorWithMessage;
            if (
                errorWithMessage.message === 'No authorization header' ||
                errorWithMessage.message === 'Invalid or expired token'
            ) {
                return {
                    statusCode: 401,
                    body: { error: 'Unauthorized' },
                };
            }
            logger.error('Save message error', err);
            return {
                statusCode: 500,
                body: { error: 'Failed to save message' },
            };
        }
    });

    // POST send message to thread (non-streaming)
    router.register('POST', '/api/chat', async (req: LambdaRequest) => {
        try {
            const { messages, threadId } = req.body as { messages: ChatMessage[]; threadId?: string };
            let currentThreadId = threadId;
            let responseContent: string;

            const user = await getUserFromRequest(req);

            // Create new thread if none provided
            if (!currentThreadId) {
                const newThread = await db.createThread(user.id, 'New Chat');
                currentThreadId = newThread.id;
            }

            // Save user message to database
            const userMessage = messages[messages.length - 1];
            if (userMessage) {
                try {
                    await db.createMessage(
                        currentThreadId,
                        user.id,
                        userMessage.role as 'user' | 'assistant',
                        userMessage.content
                    );
                } catch {
                    // Error saving user message
                }
            }

            // Generate AI response
            if (!openai.isInitialized()) {
                // Fallback service
                const fallbackMessages = (messages as ChatMessage[]).map((msg) => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content,
                }));

                const fallbackResponse = await fallback.createMockChatCompletion(fallbackMessages);
                responseContent = `⚠️ OpenAI API가 설정되지 않았습니다.\n\n${fallbackResponse.content}\n\n💡 실제 AI 응답을 받으려면:\n1. .env 파일에 OPENAI_API_KEY를 설정하세요\n2. 서버를 재시작하세요`;
            } else {
                // OpenAI API call
                const openaiMessages = (messages as ChatMessage[]).map((msg) => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content,
                }));

                const openaiResponse = await openai.createChatCompletion(openaiMessages);

                if (!openaiResponse || !openaiResponse.content) {
                    throw new Error('OpenAI API 응답이 유효하지 않습니다.');
                }

                responseContent = openaiResponse.content;
            }

            // Save assistant message to database
            try {
                await db.createMessage(currentThreadId, user.id, 'assistant', responseContent);

                // Generate title after first exchange if thread title is still "New Chat"
                const currentThread = await db.getThread(currentThreadId, user.id);

                if (currentThread?.title === 'New Chat') {
                    try {
                        const generatedTitle = await openai.generateTitle(userMessage.content);
                        await db.updateThread(currentThreadId, user.id, { title: generatedTitle });
                    } catch (titleError) {
                        logger.error('Failed to generate automatic title', titleError);
                        // Fallback to simple title generation
                        const fallbackTitle = userMessage.content.trim().substring(0, 47);
                        const finalTitle =
                            fallbackTitle.length < userMessage.content.trim().length
                                ? fallbackTitle + '...'
                                : fallbackTitle;
                        await db.updateThread(currentThreadId, user.id, { title: finalTitle });
                    }
                }
            } catch {
                // Error saving assistant message
            }

            // Create bot response
            const botResponse = {
                id: randomUUID(),
                role: 'assistant',
                content: responseContent,
                createdAt: new Date().toISOString(),
                status: 'success',
            };

            // Prepare response
            const response = {
                id: randomUUID(),
                message: botResponse,
                conversationId: currentThreadId!,
            };

            return {
                statusCode: 200,
                body: response,
            };
        } catch (err: unknown) {
            const errorWithMessage = err as ErrorWithMessage;
            if (
                errorWithMessage.message === 'No authorization header' ||
                errorWithMessage.message === 'Invalid or expired token'
            ) {
                return {
                    statusCode: 401,
                    body: { error: 'Unauthorized' },
                };
            }
            logger.error('Chat error', err);
            return {
                statusCode: 500,
                body: { error: 'Failed to process message' },
            };
        }
    });
}
