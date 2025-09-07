import { assign, createMachine } from 'xstate';
import type { ChatMessage } from '@/entities/message';

export interface ChatContext {
    messages: ChatMessage[];
    currentThreadId?: string;
    currentMessageId?: string;
    error?: Error;
}

export type ChatEvent =
    | { type: 'SEND_MESSAGE'; content: string; threadId?: string }
    | { type: 'STREAMING_MESSAGE_CHUNK'; messageId: string; content: string; conversationId?: string }
    | { type: 'STREAMING_COMPLETE'; threadId?: string }
    | { type: 'STREAMING_ERROR'; error: Error }
    | { type: 'RETRY_STREAM' }
    | { type: 'ABORT_STREAM' }
    | { type: 'PAUSE_STREAM' }
    | { type: 'RESUME_STREAM' }
    | { type: 'LOAD_MESSAGES'; messages: ChatMessage[]; threadId?: string }
    | { type: 'CLEAR_MESSAGES' }
    | { type: 'SET_THREAD'; threadId: string };

export const chatMachine = createMachine(
    {
        id: 'chat',
        types: {
            context: {} as ChatContext,
            events: {} as ChatEvent,
        },
        context: {
            messages: [],
        },
        initial: 'idle',
        states: {
            idle: {
                on: {
                    SEND_MESSAGE: {
                        target: 'sending',
                        actions: ['createUserMessage', 'createPendingAssistantMessage'],
                    },
                    LOAD_MESSAGES: {
                        actions: 'loadMessages',
                    },
                    CLEAR_MESSAGES: {
                        actions: 'clearMessages',
                    },
                    SET_THREAD: {
                        actions: 'setThread',
                    },
                },
            },
            sending: {
                on: {
                    STREAMING_MESSAGE_CHUNK: {
                        actions: 'appendToAssistantMessage',
                    },
                    STREAMING_COMPLETE: {
                        target: 'idle',
                        actions: ['finalizeMessage', 'cleanup'],
                    },
                    STREAMING_ERROR: {
                        target: 'error',
                        actions: 'setError',
                    },
                    ABORT_STREAM: {
                        target: 'idle',
                        actions: 'cleanup',
                    },
                    PAUSE_STREAM: {
                        target: 'paused',
                    },
                },
            },
            paused: {
                on: {
                    RESUME_STREAM: {
                        target: 'sending',
                    },
                    ABORT_STREAM: {
                        target: 'idle',
                        actions: 'cleanup',
                    },
                    STREAMING_COMPLETE: {
                        target: 'idle',
                        actions: ['finalizeMessage', 'cleanup'],
                    },
                },
            },
            error: {
                on: {
                    RETRY_STREAM: {
                        target: 'sending',
                    },
                    ABORT_STREAM: {
                        target: 'idle',
                        actions: 'cleanup',
                    },
                    SEND_MESSAGE: {
                        target: 'sending',
                        actions: ['createUserMessage', 'createPendingAssistantMessage'],
                    },
                },
            },
        },
    },
    {
        actions: {
            createUserMessage: assign(({ context, event }) => {
                if (event.type === 'SEND_MESSAGE') {
                    const userMessage: ChatMessage = {
                        id: crypto.randomUUID(),
                        content: event.content,
                        role: 'user',
                        createdAt: new Date().toISOString(),
                    };
                    return {
                        messages: [...context.messages, userMessage],
                        currentThreadId: event.threadId || context.currentThreadId,
                    };
                }
                return {};
            }),

            createPendingAssistantMessage: assign(({ context, event }) => {
                if (event.type === 'SEND_MESSAGE') {
                    const assistantId = crypto.randomUUID();
                    const assistantMessage: ChatMessage = {
                        id: assistantId,
                        content: '',
                        role: 'assistant',
                        createdAt: new Date().toISOString(),
                        status: 'sending',
                    };
                    return {
                        messages: [...context.messages, assistantMessage],
                        currentMessageId: assistantId,
                    };
                }
                return {};
            }),

            appendToAssistantMessage: assign(({ context, event }) => {
                if (event.type === 'STREAMING_MESSAGE_CHUNK' && context.currentMessageId) {
                    return {
                        messages: context.messages.map((msg) =>
                            msg.id === context.currentMessageId ? { ...msg, content: msg.content + event.content } : msg
                        ),
                        currentThreadId: event.conversationId || context.currentThreadId,
                    };
                }
                return {};
            }),

            finalizeMessage: assign(({ context, event }) => {
                const updates: Partial<ChatContext> = {};

                if (context.currentMessageId) {
                    updates.messages = context.messages.map((msg) =>
                        msg.id === context.currentMessageId ? { ...msg, status: 'success' as const } : msg
                    );
                }

                if (event.type === 'STREAMING_COMPLETE' && event.threadId) {
                    updates.currentThreadId = event.threadId;
                }

                return updates;
            }),

            setError: assign(({ event }) => {
                if (event.type === 'STREAMING_ERROR') {
                    return {
                        error: event.error,
                    };
                }
                return {};
            }),

            loadMessages: assign(({ event }) => {
                if (event.type === 'LOAD_MESSAGES') {
                    return {
                        messages: event.messages,
                        currentThreadId: event.threadId,
                    };
                }
                return {};
            }),

            clearMessages: assign(() => ({
                messages: [],
                currentThreadId: undefined,
            })),

            setThread: assign(({ event }) => {
                if (event.type === 'SET_THREAD') {
                    return {
                        currentThreadId: event.threadId,
                    };
                }
                return {};
            }),

            cleanup: assign(() => ({
                currentMessageId: undefined,
                error: undefined,
            })),
        },
    }
);

export type ChatMachine = typeof chatMachine;
