import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { ChatCompletionRequest, ChatCompletionResponse, ChatMessage } from 'shared/types/chat';
import { openaiService } from '../services/openai.js';
import { fallbackService } from '../services/fallback.js';
import { threadManager } from '../services/threadManager.js';
import { createUserSupabaseClient } from '../services/supabase.js';
import OpenAI from 'openai';

async function getUserFromRequest(request: { headers: { authorization?: string } }) {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const userClient = createUserSupabaseClient(token);

    const {
        data: { user },
        error,
    } = await userClient.auth.getUser();
    if (error || !user) {
        throw new Error('Invalid or expired token');
    }

    return { user, userClient };
}

export function registerChatRoutes(fastify: FastifyInstance) {
    // GET all threads
    fastify.get('/api/threads', async (request, reply) => {
        try {
            // Get authenticated user
            let user, userClient;
            try {
                const { user: authUser, userClient: authUserClient } = await getUserFromRequest(request);
                user = authUser;
                userClient = authUserClient;
            } catch {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            // Get threads with message counts
            const { data: threads, error: threadsError } = await userClient
                .from('threads')
                .select(
                    `
                    *,
                    messages:messages(id, content, role, created_at)
                `
                )
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (threadsError) {
                console.error('Database error:', threadsError);
                return reply.code(500).send({ error: 'Failed to fetch threads' });
            }

            // Format threads with message counts and ensure proper dates
            const formattedThreads = (threads || []).map((thread) => ({
                ...thread,
                messages: thread.messages || [],
                createdAt: thread.created_at || new Date().toISOString(),
                updatedAt: thread.updated_at || thread.created_at || new Date().toISOString(),
            }));

            return reply.send({ threads: formattedThreads });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to get threads' });
        }
    });

    // GET specific thread
    fastify.get<{ Params: { id: string } }>('/api/threads/:id', async (request, reply) => {
        try {
            const { id } = request.params;

            // Get authenticated user
            let user, userClient;
            try {
                const { user: authUser, userClient: authUserClient } = await getUserFromRequest(request);
                user = authUser;
                userClient = authUserClient;
            } catch {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const { data: thread, error: threadError } = await userClient
                .from('threads')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (threadError || !thread) {
                return reply.code(404).send({ error: 'Thread not found' });
            }

            return reply.send({ thread });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to get thread' });
        }
    });

    // POST create new thread
    fastify.post('/api/threads', async (request, reply) => {
        try {
            // Get authenticated user
            let user, userClient;
            try {
                const { user: authUser, userClient: authUserClient } = await getUserFromRequest(request);
                user = authUser;
                userClient = authUserClient;
            } catch {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const { data: thread, error: createError } = await userClient
                .from('threads')
                .insert({
                    title: 'New Chat',
                    user_id: user.id,
                })
                .select()
                .single();

            if (createError || !thread) {
                console.error('Failed to create thread:', createError);
                return reply.code(500).send({ error: 'Failed to create thread' });
            }

            return reply.send({ thread });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to create thread' });
        }
    });

    // DELETE thread
    fastify.delete<{ Params: { id: string } }>('/api/threads/:id', async (request, reply) => {
        try {
            const { id } = request.params;

            // Get authenticated user
            let user, userClient;
            try {
                const { user: authUser, userClient: authUserClient } = await getUserFromRequest(request);
                user = authUser;
                userClient = authUserClient;
            } catch {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            // Delete thread and its messages (cascade delete is handled by DB)
            const { error: deleteError } = await userClient
                .from('threads')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (deleteError) {
                console.error('Failed to delete thread:', deleteError);
                return reply.code(500).send({ error: 'Failed to delete thread' });
            }

            return reply.send({ success: true });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to delete thread' });
        }
    });

    // GET thread messages
    fastify.get<{ Params: { id: string } }>('/api/threads/:id/messages', async (request, reply) => {
        try {
            const { id } = request.params;

            // Get authenticated user
            let user, userClient;
            try {
                const { user: authUser, userClient: authUserClient } = await getUserFromRequest(request);
                user = authUser;
                userClient = authUserClient;
            } catch {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            // First verify the thread exists and belongs to the user
            const { data: thread, error: threadError } = await userClient
                .from('threads')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (threadError || !thread) {
                return reply.code(404).send({ error: 'Thread not found' });
            }

            // Get messages for the thread
            const { data: messages, error: messagesError } = await userClient
                .from('messages')
                .select('*')
                .eq('thread_id', id)
                .order('created_at', { ascending: true });

            if (messagesError) {
                console.error('Database error:', messagesError);
                return reply.code(500).send({ error: 'Failed to fetch messages' });
            }

            return reply.send({
                thread: {
                    ...thread,
                    messages: messages || [],
                },
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to get thread messages' });
        }
    });

    // PUT update thread title
    fastify.put<{ Params: { id: string }; Body: { title: string } }>('/api/threads/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const { title } = request.body;

            // Get authenticated user
            let user, userClient;
            try {
                const { user: authUser, userClient: authUserClient } = await getUserFromRequest(request);
                user = authUser;
                userClient = authUserClient;
            } catch {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const { data: updatedThread, error } = await userClient
                .from('threads')
                .update({ title, updated_at: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error || !updatedThread) {
                console.error('Failed to update thread:', error);
                return reply.code(404).send({ error: 'Thread not found or failed to update' });
            }

            return reply.send({ success: true, thread: updatedThread });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to update thread' });
        }
    });

    // POST generate thread title from first message
    fastify.post<{ Params: { id: string } }>('/api/threads/:id/generate-title', async (request, reply) => {
        try {
            const { id } = request.params;

            // Get authenticated user
            let user, userClient;
            try {
                const { user: authUser, userClient: authUserClient } = await getUserFromRequest(request);
                user = authUser;
                userClient = authUserClient;
            } catch {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            // Get thread and first user message
            const { data: thread, error: threadError } = await userClient
                .from('threads')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (threadError || !thread) {
                return reply.code(404).send({ error: 'Thread not found' });
            }

            // Get first user message
            const { data: firstMessage, error: messageError } = await userClient
                .from('messages')
                .select('content')
                .eq('thread_id', id)
                .eq('role', 'user')
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            if (messageError || !firstMessage) {
                return reply.code(404).send({ error: 'No user message found in thread' });
            }

            // Generate title using OpenAI
            let generatedTitle: string;
            try {
                generatedTitle = await openaiService.generateTitle(firstMessage.content);
            } catch {
                // Fallback to simple title generation
                const fallbackTitle = firstMessage.content.trim().substring(0, 47);
                generatedTitle =
                    fallbackTitle.length < firstMessage.content.trim().length ? fallbackTitle + '...' : fallbackTitle;
            }

            // Update thread with generated title
            const { data: updatedThread, error: updateError } = await userClient
                .from('threads')
                .update({
                    title: generatedTitle,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (updateError || !updatedThread) {
                console.error('Failed to update thread with generated title:', updateError);
                return reply.code(500).send({ error: 'Failed to update thread title' });
            }

            return reply.send({
                success: true,
                title: generatedTitle,
                thread: updatedThread,
            });
        } catch (err) {
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

            // Get authenticated user
            let user, userClient;
            try {
                const { user: authUser, userClient: authUserClient } = await getUserFromRequest(request);
                user = authUser;
                userClient = authUserClient;
            } catch {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            // Verify thread belongs to user
            const { data: thread, error: threadError } = await userClient
                .from('threads')
                .select('id')
                .eq('id', threadId)
                .eq('user_id', user.id)
                .single();

            if (threadError || !thread) {
                return reply.code(404).send({ error: 'Thread not found' });
            }

            // Save or update message
            const { data: savedMessage, error } = await userClient
                .from('messages')
                .upsert({
                    id: messageId,
                    thread_id: threadId,
                    user_id: user.id,
                    role,
                    content,
                })
                .select()
                .single();

            if (error) {
                console.error('Failed to save message:', error);
                return reply.code(500).send({ error: 'Failed to save message' });
            }

            // Update thread's updated_at timestamp
            await userClient.from('threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);

            return reply.send({ success: true, message: savedMessage });
        } catch (err) {
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

            // Get authenticated user
            let user, userClient;
            try {
                const { user: authUser, userClient: authUserClient } = await getUserFromRequest(request);
                user = authUser;
                userClient = authUserClient;
            } catch {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            // Create new thread if none provided
            if (!currentThreadId) {
                const { data: newThread, error: threadError } = await userClient
                    .from('threads')
                    .insert({
                        title: 'New Chat',
                        user_id: user.id,
                    })
                    .select()
                    .single();

                if (threadError || !newThread) {
                    console.error('Failed to create thread:', threadError);
                    return reply.code(500).send({ error: 'Failed to create thread' });
                }

                currentThreadId = newThread.id;
            }

            // Save user message to database
            const userMessage = messages[messages.length - 1];
            if (userMessage) {
                try {
                    const { error: userMessageError } = await userClient.from('messages').insert({
                        thread_id: currentThreadId,
                        user_id: user.id,
                        role: userMessage.role,
                        content: userMessage.content,
                    });

                    if (userMessageError) {
                        console.error('Failed to save user message:', userMessageError);
                    }
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
                const fallbackMessages = messages.map((msg: any) => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content,
                }));

                const fallbackResponse = await fallbackService.createMockChatCompletion(fallbackMessages);
                responseContent = `⚠️ OpenAI API가 설정되지 않았습니다.\n\n${fallbackResponse.content}\n\n💡 실제 AI 응답을 받으려면:\n1. .env 파일에 OPENAI_API_KEY를 설정하세요\n2. 서버를 재시작하세요`;
            } else {
                // OpenAI API call
                const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messages.map(
                    (msg: any) => ({
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
                const { error: assistantMessageError } = await userClient.from('messages').insert({
                    thread_id: currentThreadId,
                    user_id: user.id,
                    role: 'assistant',
                    content: responseContent,
                });

                if (assistantMessageError) {
                    console.error('Failed to save assistant message:', assistantMessageError);
                } else {
                    // Update thread's updated_at timestamp
                    await userClient
                        .from('threads')
                        .update({ updated_at: new Date().toISOString() })
                        .eq('id', currentThreadId);

                    // Generate title after first exchange if thread title is still "New Chat"
                    const { data: currentThread } = await userClient
                        .from('threads')
                        .select('title')
                        .eq('id', currentThreadId)
                        .single();

                    if (currentThread?.title === 'New Chat') {
                        try {
                            const generatedTitle = await openaiService.generateTitle(userMessage.content);
                            await userClient
                                .from('threads')
                                .update({ title: generatedTitle })
                                .eq('id', currentThreadId);
                        } catch (titleError) {
                            console.error('Failed to generate automatic title:', titleError);
                            // Fallback to simple title generation
                            const fallbackTitle = userMessage.content.trim().substring(0, 47);
                            const finalTitle =
                                fallbackTitle.length < userMessage.content.trim().length
                                    ? fallbackTitle + '...'
                                    : fallbackTitle;
                            await userClient.from('threads').update({ title: finalTitle }).eq('id', currentThreadId);
                        }
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
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to process message' });
        }
    });
}
