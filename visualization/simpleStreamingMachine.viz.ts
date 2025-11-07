// XState Visualization Configuration for Simple Streaming Machine
// Visit https://stately.ai/viz to visualize this machine

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

// Visualizable machine configuration - copy this to https://stately.ai/viz
export const visualizableStreamingMachine = createMachine(
    {
        id: 'simpleStreaming',
        initial: 'idle',
        context: {
            timeout: 30000,
            maxRetries: 3,
            currentRetries: 0,
        } as SimpleStreamingContext,
        states: {
            idle: {
                description: 'Waiting for START event',
                on: {
                    START: {
                        target: 'connecting',
                        actions: 'initializeStreaming',
                        description: 'Initialize streaming with URL and headers',
                    },
                },
            },
            connecting: {
                description: 'Establishing SSE connection',
                after: {
                    30000: {
                        target: 'timeout',
                        actions: 'setTimeoutError',
                        description: 'Connection timeout after 30s',
                    },
                },
                on: {
                    COMPLETE: {
                        target: 'completed',
                        description: 'Stream completed successfully',
                    },
                    ERROR: {
                        target: 'error',
                        actions: 'setError',
                        description: 'Connection error occurred',
                    },
                    ABORT: {
                        target: 'aborted',
                        description: 'User aborted connection',
                    },
                },
            },
            streaming: {
                description: 'Actively receiving stream data',
                initial: 'active',
                states: {
                    active: {
                        description: 'Stream is active and processing data',
                        on: {
                            PAUSE: {
                                target: 'paused',
                                description: 'User paused streaming',
                            },
                        },
                    },
                    paused: {
                        description: 'Stream is paused by user',
                        on: {
                            RESUME: {
                                target: 'active',
                                description: 'User resumed streaming',
                            },
                        },
                    },
                },
                on: {
                    COMPLETE: {
                        target: 'completed',
                        description: 'Stream completed successfully',
                    },
                    ERROR: {
                        target: 'error',
                        actions: 'setError',
                        description: 'Streaming error occurred',
                    },
                    ABORT: {
                        target: 'aborted',
                        description: 'User aborted stream',
                    },
                },
            },
            completed: {
                type: 'final',
                description: 'Stream completed successfully',
            },
            error: {
                description: 'Error occurred during streaming',
                on: {
                    RETRY: [
                        {
                            target: 'connecting',
                            guard: 'canRetry',
                            actions: ['incrementRetry', 'clearError'],
                            description: 'Retry if attempts < maxRetries',
                        },
                        {
                            target: 'failed',
                            description: 'Max retries exceeded',
                        },
                    ],
                    ABORT: {
                        target: 'aborted',
                        description: 'User aborted after error',
                    },
                },
            },
            timeout: {
                description: 'Connection timed out',
                on: {
                    RETRY: [
                        {
                            target: 'connecting',
                            guard: 'canRetry',
                            actions: ['incrementRetry', 'clearError'],
                            description: 'Retry if attempts < maxRetries',
                        },
                        {
                            target: 'failed',
                            description: 'Max retries exceeded',
                        },
                    ],
                    ABORT: {
                        target: 'aborted',
                        description: 'User aborted after timeout',
                    },
                },
            },
            failed: {
                type: 'final',
                description: 'Stream failed permanently after max retries',
            },
            aborted: {
                type: 'final',
                description: 'Stream aborted by user',
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

export type SimpleStreamingMachine = typeof visualizableStreamingMachine;
