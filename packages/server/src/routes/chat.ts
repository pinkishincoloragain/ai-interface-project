import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { ChatCompletionRequest, ChatCompletionResponse, ChatMessage } from 'shared/types/chat';
import { fallbackService, openaiService } from '@/services';
import { threadManager } from '@/services/threadManager';
import { getUserFromRequest } from '@utils/auth';
import OpenAI from 'openai';

export function registerChatRoutes(fastify: FastifyInstance) {
    // GET all threads
    fastify.get('/api/threads', async (request, reply) => {
        try {
            const user = await getUserFromRequest(fastify, request);
            const threads = await fastify.db.getUserThreads(user.id);

            const formattedThreads = threads.map((thread) => ({
                ...thread,
                createdAt: thread.created_at,
                updatedAt: thread.updated_at,
            }));

            return reply.send({ threads: formattedThreads });
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                (err.message === 'No authorization header' || err.message === 'Invalid or expired token')
            ) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to get threads' });
        }
    });

    // GET specific thread
    fastify.get<{ Params: { id: string } }>('/api/threads/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const user = await getUserFromRequest(fastify, request);
            const thread = await fastify.db.getThread(id, user.id);

            if (!thread) {
                return reply.code(404).send({ error: 'Thread not found' });
            }

            return reply.send({ thread });
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                (err.message === 'No authorization header' || err.message === 'Invalid or expired token')
            ) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to get thread' });
        }
    });

    // POST create new thread
    fastify.post('/api/threads', async (request, reply) => {
        try {
            const user = await getUserFromRequest(fastify, request);
            const thread = await fastify.db.createThread(user.id, 'New Chat');

            return reply.send({ thread });
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                (err.message === 'No authorization header' || err.message === 'Invalid or expired token')
            ) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to create thread' });
        }
    });

    // DELETE thread
    fastify.delete<{ Params: { id: string } }>('/api/threads/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const user = await getUserFromRequest(fastify, request);
            const deleted = await fastify.db.deleteThread(id, user.id);

            if (!deleted) {
                return reply.code(404).send({ error: 'Thread not found' });
            }

            return reply.send({ success: true });
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                (err.message === 'No authorization header' || err.message === 'Invalid or expired token')
            ) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to delete thread' });
        }
    });

    // GET thread messages
    fastify.get<{ Params: { id: string } }>('/api/threads/:id/messages', async (request, reply) => {
        try {
            const { id } = request.params;
            const user = await getUserFromRequest(fastify, request);
            const thread = await fastify.db.getThread(id, user.id);

            if (!thread) {
                return reply.code(404).send({ error: 'Thread not found' });
            }

            const messages = await fastify.db.getThreadMessages(id, user.id);

            return reply.send({
                thread: {
                    ...thread,
                    messages: messages || [],
                },
            });
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                (err.message === 'No authorization header' || err.message === 'Invalid or expired token')
            ) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to get thread messages' });
        }
    });

    // PUT update thread title
    fastify.put<{ Params: { id: string }; Body: { title: string } }>('/api/threads/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const { title } = request.body;
            const user = await getUserFromRequest(fastify, request);

            const updatedThread = await fastify.db.updateThread(id, user.id, { title });

            if (!updatedThread) {
                return reply.code(404).send({ error: 'Thread not found or failed to update' });
            }

            return reply.send({ success: true, thread: updatedThread });
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                (err.message === 'No authorization header' || err.message === 'Invalid or expired token')
            ) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to update thread' });
        }
    });

    // POST generate thread title from first message
    fastify.post<{ Params: { id: string } }>('/api/threads/:id/generate-title', async (request, reply) => {
        try {
            const { id } = request.params;
            const user = await getUserFromRequest(fastify, request);

            const thread = await fastify.db.getThread(id, user.id);
            if (!thread) {
                return reply.code(404).send({ error: 'Thread not found' });
            }

            const messages = await fastify.db.getThreadMessages(id, user.id);
            const firstUserMessage = messages.find((m) => m.role === 'user');

            if (!firstUserMessage) {
                return reply.code(404).send({ error: 'No user message found in thread' });
            }

            // Generate title using OpenAI
            let generatedTitle: string;
            try {
                generatedTitle = await openaiService.generateTitle(firstUserMessage.content);
            } catch {
                // Fallback to simple title generation
                const fallbackTitle = firstUserMessage.content.trim().substring(0, 47);
                generatedTitle =
                    fallbackTitle.length < firstUserMessage.content.trim().length
                        ? fallbackTitle + '...'
                        : fallbackTitle;
            }

            const updatedThread = await fastify.db.updateThread(id, user.id, { title: generatedTitle });

            if (!updatedThread) {
                return reply.code(500).send({ error: 'Failed to update thread title' });
            }

            return reply.send({
                success: true,
                title: generatedTitle,
                thread: updatedThread,
            });
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                (err.message === 'No authorization header' || err.message === 'Invalid or expired token')
            ) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to generate thread title' });
        }
    });

    // POST save partial message (for aborted/stopped messages)
    fastify.post<{
        Body: {
            threadId: string;
            messageId: string;
            content: string;
            role: 'user' | 'assistant';
        };
    }>('/api/messages/save', async (request, reply) => {
        try {
            const { threadId, messageId, content, role } = request.body;
            const user = await getUserFromRequest(fastify, request);

            const thread = await fastify.db.getThread(threadId, user.id);
            if (!thread) {
                return reply.code(404).send({ error: 'Thread not found' });
            }

            const savedMessage = await fastify.db.upsertMessage(messageId, threadId, user.id, role, content);

            return reply.send({ success: true, message: savedMessage });
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                (err.message === 'No authorization header' || err.message === 'Invalid or expired token')
            ) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to save message' });
        }
    });

    // POST send message to thread
    fastify.post<{ Body: ChatCompletionRequest & { threadId?: string } }>('/api/chat', async (request, reply) => {
        try {
            const { messages, threadId } = request.body as ChatCompletionRequest & { threadId?: string };
            let currentThreadId = threadId;
            let responseContent: string;

            const user = await getUserFromRequest(fastify, request);

            // Create new thread if none provided
            if (!currentThreadId) {
                const newThread = await fastify.db.createThread(user.id, 'New Chat');
                currentThreadId = newThread.id;
            }

            // Save user message to database
            const userMessage = messages[messages.length - 1];
            if (userMessage) {
                try {
                    await fastify.db.createMessage(
                        currentThreadId,
                        user.id,
                        userMessage.role as 'user' | 'assistant',
                        userMessage.content
                    );
                } catch {
                    // Error saving user message
                }
            }

            // Also maintain legacy compatibility with in-memory store
            const userChatMessage: ChatMessage = {
                id: uuidv4(),
                role: userMessage.role,
                content: userMessage.content,
                createdAt: new Date().toISOString(),
                status: 'success',
            };
            threadManager.addMessageToThread(currentThreadId!, userChatMessage);

            // Generate AI response
            if (!openaiService.isInitialized()) {
                // Fallback service
                const fallbackMessages = messages.map((msg: { role: string; content: string }) => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content,
                }));

                const fallbackResponse = await fallbackService.createMockChatCompletion(fallbackMessages);
                responseContent = `⚠️ OpenAI API가 설정되지 않았습니다.\n\n${fallbackResponse.content}\n\n💡 실제 AI 응답을 받으려면:\n1. .env 파일에 OPENAI_API_KEY를 설정하세요\n2. 서버를 재시작하세요`;
            } else {
                // OpenAI API call
                const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messages.map(
                    (msg: { role: string; content: string }) => ({
                        role: msg.role as 'user' | 'assistant' | 'system',
                        content: msg.content,
                    })
                );

                const openaiResponse = await openaiService.createChatCompletion(openaiMessages);

                if (!openaiResponse || !openaiResponse.content) {
                    throw new Error('OpenAI API 응답이 유효하지 않습니다.');
                }

                responseContent = openaiResponse.content;
            }

            // Save assistant message to database
            try {
                await fastify.db.createMessage(currentThreadId, user.id, 'assistant', responseContent);

                // Generate title after first exchange if thread title is still "New Chat"
                const currentThread = await fastify.db.getThread(currentThreadId, user.id);

                if (currentThread?.title === 'New Chat') {
                    try {
                        const generatedTitle = await openaiService.generateTitle(userMessage.content);
                        await fastify.db.updateThread(currentThreadId, user.id, { title: generatedTitle });
                    } catch (titleError) {
                        console.error('Failed to generate automatic title:', titleError);
                        // Fallback to simple title generation
                        const fallbackTitle = userMessage.content.trim().substring(0, 47);
                        const finalTitle =
                            fallbackTitle.length < userMessage.content.trim().length
                                ? fallbackTitle + '...'
                                : fallbackTitle;
                        await fastify.db.updateThread(currentThreadId, user.id, { title: finalTitle });
                    }
                }
            } catch {
                // Error saving assistant message
            }

            // Create bot response
            const botResponse: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: responseContent,
                createdAt: new Date().toISOString(),
                status: 'success',
            };

            // Also add bot response to in-memory thread for legacy compatibility
            threadManager.addMessageToThread(currentThreadId!, botResponse);

            // Prepare response
            const response: ChatCompletionResponse = {
                id: uuidv4(),
                message: botResponse,
                conversationId: currentThreadId!,
            };

            return reply.send(response);
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                (err.message === 'No authorization header' || err.message === 'Invalid or expired token')
            ) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to process message' });
        }
    });
}
