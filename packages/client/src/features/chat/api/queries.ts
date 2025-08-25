import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from './chatApi';
import { useChatStore } from '../model/store';
import { MessageFactory, type ChatMessage } from '@/entities/message';
import { QUERY_KEYS } from '@/shared/lib/react-query';
import { createChatSSEAdapter } from '../lib/chat-sse-adapter';

export interface SendMessageParams {
    content: string;
    threadId?: string;
}

export const useSendMessageMutation = () => {
    const queryClient = useQueryClient();
    const addMessage = useChatStore((state) => state.addMessage);
    const updateMessage = useChatStore((state) => state.updateMessage);
    const removeMessage = useChatStore((state) => state.removeMessage);
    const setCurrentThreadId = useChatStore((state) => state.setCurrentThreadId);
    const setLoading = useChatStore((state) => state.setLoading);
    const currentThreadId = useChatStore((state) => state.currentThreadId);

    return useMutation({
        mutationFn: async ({ content, threadId }: SendMessageParams) => {
            setLoading(true);

            // Create user message
            const userMessage = MessageFactory.createUserMessage(content);

            addMessage(userMessage);

            try {
                // Get current messages for the request
                const currentMessages = [
                    ...useChatStore.getState().messages.filter((m) => m.status === 'success'),
                    userMessage,
                ];

                // Send request
                const response = await chatApi.sendMessage(currentMessages, threadId || currentThreadId);

                // Create placeholder assistant message
                const assistantPlaceholder = MessageFactory.createAssistantMessage('');
                addMessage(assistantPlaceholder);

                // Process SSE stream with the enhanced architecture
                let assistantMessageId: string | null = assistantPlaceholder.id;

                // Create enhanced SSE adapter with better error handling and retry logic
                const chatAdapter = createChatSSEAdapter({
                    messageId: assistantPlaceholder.id,
                    conversationId: threadId || currentThreadId,
                    timeout: 60000,
                    autoRetry: true,
                    retryConfig: {
                        maxAttempts: 3,
                        initialDelay: 1000,
                        maxDelay: 10000,
                        backoffMultiplier: 2,
                    },
                });

                // Set up enhanced event handlers
                chatAdapter.setHandlers({
                    // Handle streaming messages
                    onMessage: (event) => {
                        // Update thread ID if not set
                        if (event.conversationId && !currentThreadId) {
                            setCurrentThreadId(event.conversationId);
                        }

                        // Handle message ID synchronization
                        if (event.messageId !== assistantMessageId) {
                            const oldId = assistantMessageId;
                            assistantMessageId = event.messageId;

                            if (oldId) {
                                removeMessage(oldId);
                            }
                        }

                        // Update message content
                        if (event.content !== undefined) {
                            const assistantMessage: ChatMessage = {
                                id: assistantMessageId!,
                                role: 'assistant',
                                content: event.content,
                                createdAt: new Date().toISOString(),
                                status: event.isDone ? 'success' : 'sending',
                            };

                            // Check if message exists and update accordingly
                            const currentMessages = useChatStore.getState().messages;
                            const existingMessage = currentMessages.find((m) => m.id === assistantMessageId);

                            if (existingMessage) {
                                updateMessage(assistantMessageId!, assistantMessage);
                            } else {
                                addMessage(assistantMessage);
                            }
                        }
                    },

                    // Handle errors with user-friendly messages
                    onError: (event) => {
                        setLoading(false);

                        if (assistantMessageId) {
                            // Create error message with user-friendly text
                            updateMessage(assistantMessageId, {
                                status: 'error',
                                content: event.userMessage || '오류가 발생했습니다.',
                            });
                        }

                        console.error('Enhanced streaming error:', {
                            type: event.error.type,
                            message: event.error.message,
                            recoverable: event.error.recoverable,
                            userMessage: event.userMessage,
                        });
                    },

                    // Handle completion
                    onComplete: (event) => {
                        setLoading(false);

                        if (assistantMessageId) {
                            updateMessage(assistantMessageId, { status: 'success' });
                        }

                        // Invalidate queries after streaming completes
                        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.threads.list() });
                        if (event.conversationId) {
                            queryClient.invalidateQueries({
                                queryKey: QUERY_KEYS.threads.messages(event.conversationId),
                            });
                        }
                    },

                    // Handle timeout with better UX
                    onTimeout: () => {
                        setLoading(false);

                        if (assistantMessageId) {
                            updateMessage(assistantMessageId, {
                                status: 'error',
                                content: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
                            });
                        }
                    },

                    // Handle retry attempts
                    onRetry: (event) => {
                        console.log(
                            `Retrying request (attempt ${event.attempt}), next retry in ${event.nextRetryIn}ms`
                        );
                        // Could show retry UI feedback here
                    },
                });

                return chatAdapter.stream(response);
            } catch (error) {
                setLoading(false);
                // If we have an assistant message placeholder, mark it as error
                const currentMessages = useChatStore.getState().messages;
                const assistantMessage = currentMessages.find((m) => m.role === 'assistant' && m.status === 'sending');
                if (assistantMessage) {
                    updateMessage(assistantMessage.id, { status: 'error' });
                }
                throw error;
            }
        },
        onSuccess: (_responseThreadId) => {
            // Query invalidation is now handled in the streaming completion handler
        },
        onError: (error) => {
            console.error('Failed to send message:', error);
            setLoading(false);
        },
    });
};
