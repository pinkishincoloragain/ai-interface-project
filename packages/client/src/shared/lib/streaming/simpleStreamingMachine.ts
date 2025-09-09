import { assign, createMachine } from 'xstate';

export interface SimpleStreamingContext {
    url?: string;
    headers?: Record<string, string>;
    timeout: number;
    maxRetries: number;
    currentRetries: number;
    messageId?: string;
    conversationId?: string;
    error?: Error;
}

export type SimpleStreamingEvent =
    | { type: 'START'; url: string; headers?: Record<string, string>; messageId?: string }
    | { type: 'COMPLETE' }
    | { type: 'ERROR'; error: Error }
    | { type: 'TIMEOUT' }
    | { type: 'RETRY' }
    | { type: 'ABORT' }
    | { type: 'PAUSE' }
    | { type: 'RESUME' };

export const simpleStreamingMachine = createMachine(
    {
        id: 'simpleStreaming',
        context: {
            timeout: 30000,
            maxRetries: 3,
            currentRetries: 0,
        } as SimpleStreamingContext,
        initial: 'idle',
        states: {
            idle: {
                on: {
                    START: {
                        target: 'connecting',
                        actions: ['initializeStreaming'],
                    },
                },
            },
            connecting: {
                after: {
                    30000: {
                        target: 'timeout',
                        actions: ['setTimeoutError'],
                    },
                },
                on: {
                    COMPLETE: {
                        target: 'completed',
                    },
                    ERROR: {
                        target: 'error',
                        actions: ['setError'],
                    },
                    ABORT: {
                        target: 'aborted',
                    },
                },
            },
            streaming: {
                initial: 'active',
                states: {
                    active: {
                        on: {
                            PAUSE: {
                                target: 'paused',
                            },
                        },
                    },
                    paused: {
                        on: {
                            RESUME: {
                                target: 'active',
                            },
                        },
                    },
                },
                on: {
                    COMPLETE: {
                        target: 'completed',
                    },
                    ERROR: {
                        target: 'error',
                        actions: ['setError'],
                    },
                    ABORT: {
                        target: 'aborted',
                    },
                },
            },
            completed: {
                type: 'final',
            },
            error: {
                on: {
                    RETRY: [
                        {
                            target: 'connecting',
                            guard: 'canRetry',
                            actions: ['incrementRetry', 'clearError'],
                        },
                        {
                            target: 'failed',
                        },
                    ],
                    ABORT: {
                        target: 'aborted',
                    },
                },
            },
            timeout: {
                on: {
                    RETRY: [
                        {
                            target: 'connecting',
                            guard: 'canRetry',
                            actions: ['incrementRetry', 'clearError'],
                        },
                        {
                            target: 'failed',
                        },
                    ],
                    ABORT: {
                        target: 'aborted',
                    },
                },
            },
            failed: {
                type: 'final',
            },
            aborted: {
                type: 'final',
            },
        },
    },
    {
        actions: {
            initializeStreaming: assign(({ context, event }) => {
                if (event.type === 'START') {
                    return {
                        ...context,
                        url: event.url,
                        headers: event.headers,
                        messageId: event.messageId,
                        currentRetries: 0,
                        error: undefined,
                    };
                }
                return context;
            }),

            setError: assign(({ context, event }) => ({
                ...context,
                error: event.type === 'ERROR' ? event.error : context.error,
            })),

            setTimeoutError: assign(({ context }) => ({
                ...context,
                error: new Error(`Stream timed out after ${context.timeout}ms`),
            })),

            incrementRetry: assign(({ context }) => ({
                ...context,
                currentRetries: context.currentRetries + 1,
            })),

            clearError: assign(({ context }) => ({
                ...context,
                error: undefined,
            })),
        },

        guards: {
            canRetry: ({ context }) => context.currentRetries < context.maxRetries,
        },
    }
);

export type SimpleStreamingMachine = typeof simpleStreamingMachine;
