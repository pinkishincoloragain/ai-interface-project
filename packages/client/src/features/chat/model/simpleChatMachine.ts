import { assign, createMachine } from 'xstate';
import type { ChatMessage } from '@/entities/message';

export interface SimpleChatContext {
    messages: ChatMessage[];
    currentThreadId?: string;
    currentMessageId?: string;
    error?: Error;
}

export type SimpleChatEvent =
    | { type: 'SEND_MESSAGE'; content: string; threadId?: string }
    | { type: 'MESSAGE_CHUNK'; messageId: string; content: string; conversationId?: string }
    | { type: 'STREAMING_COMPLETE'; threadId?: string }
    | { type: 'STREAMING_ERROR'; error: Error }
    | { type: 'RETRY' }
    | { type: 'ABORT' }
    | { type: 'PAUSE' }
    | { type: 'RESUME' }
    | { type: 'LOAD_MESSAGES'; messages: ChatMessage[]; threadId?: string }
    | { type: 'CLEAR_MESSAGES' }
    | { type: 'SET_THREAD'; threadId: string };

export const simpleChatMachine = createMachine(
    {
        id: 'simpleChat',
        context: {
            messages: [],
            currentThreadId: undefined,
            currentMessageId: undefined,
            error: undefined,
        } as SimpleChatContext,
        initial: 'idle',
        states: {
            idle: {
                on: {
                    SEND_MESSAGE: {
                        target: 'streaming',
                        actions: ['createMessages'],
                    },
                    LOAD_MESSAGES: {
                        actions: ['loadMessages'],
                    },
                    CLEAR_MESSAGES: {
                        actions: ['clearMessages'],
                    },
                    SET_THREAD: {
                        actions: ['setThread'],
                    },
                },
            },
            streaming: {
                on: {
                    MESSAGE_CHUNK: {
                        actions: ['appendToMessage'],
                    },
                    STREAMING_COMPLETE: {
                        target: 'idle',
                        actions: ['finalizeMessage'],
                    },
                    STREAMING_ERROR: {
                        target: 'error',
                        actions: ['setError'],
                    },
                    PAUSE: {
                        target: 'paused',
                    },
                    ABORT: {
                        target: 'idle',
                        actions: ['cleanup'],
                    },
                },
            },
            paused: {
                on: {
                    RESUME: {
                        target: 'streaming',
                    },
                    ABORT: {
                        target: 'idle',
                        actions: ['cleanup'],
                    },
                    STREAMING_COMPLETE: {
                        target: 'idle',
                        actions: ['finalizeMessage'],
                    },
                },
            },
            error: {
                on: {
                    RETRY: {
                        target: 'streaming',
                        actions: ['clearError'],
                    },
                    ABORT: {
                        target: 'idle',
                        actions: ['cleanup'],
                    },
                    SEND_MESSAGE: {
                        target: 'streaming',
                        actions: ['createMessages', 'clearError'],
                    },
                },
            },
        },
    },
    {
        actions: {
            createMessages: assign(({ context, event }) => {
                if (event.type === 'SEND_MESSAGE') {
                    const userMessage: ChatMessage = {
                        id: crypto.randomUUID(),
                        content: event.content,
                        role: 'user',
                        createdAt: new Date().toISOString(),
                    };

                    const assistantId = crypto.randomUUID();
                    const assistantMessage: ChatMessage = {
                        id: assistantId,
                        content: '',
                        role: 'assistant',
                        createdAt: new Date().toISOString(),
                        status: 'sending',
                    };

                    return {
                        ...context,
                        messages: [...context.messages, userMessage, assistantMessage],
                        currentMessageId: assistantId,
                        currentThreadId: event.threadId || context.currentThreadId,
                    };
                }
                return context;
            }),

            appendToMessage: assign(({ context, event }) => {
                if (event.type === 'MESSAGE_CHUNK' && context.currentMessageId) {
                    return {
                        ...context,
                        messages: context.messages.map((msg) =>
                            msg.id === context.currentMessageId ? { ...msg, content: msg.content + event.content } : msg
                        ),
                        currentThreadId: event.conversationId || context.currentThreadId,
                    };
                }
                return context;
            }),

            finalizeMessage: assign(({ context, event }) => ({
                ...context,
                messages: context.currentMessageId
                    ? context.messages.map((msg) =>
                          msg.id === context.currentMessageId ? { ...msg, status: 'success' as const } : msg
                      )
                    : context.messages,
                currentThreadId:
                    event.type === 'STREAMING_COMPLETE' && event.threadId ? event.threadId : context.currentThreadId,
                currentMessageId: undefined,
            })),

            setError: assign(({ context, event }) => ({
                ...context,
                error: event.type === 'STREAMING_ERROR' ? event.error : context.error,
            })),

            clearError: assign(({ context }) => ({
                ...context,
                error: undefined,
            })),

            loadMessages: assign(({ context, event }) => ({
                ...context,
                messages: event.type === 'LOAD_MESSAGES' ? event.messages : context.messages,
                currentThreadId: event.type === 'LOAD_MESSAGES' ? event.threadId : context.currentThreadId,
            })),

            clearMessages: assign(({ context }) => ({
                ...context,
                messages: [],
                currentThreadId: undefined,
            })),

            setThread: assign(({ context, event }) => ({
                ...context,
                currentThreadId: event.type === 'SET_THREAD' ? event.threadId : context.currentThreadId,
            })),

            cleanup: assign(({ context }) => ({
                ...context,
                currentMessageId: undefined,
                error: undefined,
            })),
        },
    }
);

export type SimpleChatMachine = typeof simpleChatMachine;
