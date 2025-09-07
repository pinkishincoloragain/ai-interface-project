import { assign, createMachine } from 'xstate';

export interface StreamingContext {
    url?: string;
    headers?: Record<string, string>;
    timeout: number;
    maxRetries: number;
    currentRetries: number;
    buffer: string;
    messageId?: string;
    conversationId?: string;
    error?: Error;
    reader?: ReadableStreamDefaultReader<Uint8Array>;
    timeoutId?: NodeJS.Timeout;
    abortController?: AbortController;
}

export type StreamingEvent =
    | { type: 'START'; url: string; headers?: Record<string, string>; messageId?: string }
    | { type: 'CHUNK_RECEIVED'; chunk: Uint8Array }
    | { type: 'MESSAGE_PARSED'; data: string; messageId?: string; conversationId?: string }
    | { type: 'COMPLETE' }
    | { type: 'ERROR'; error: Error }
    | { type: 'TIMEOUT' }
    | { type: 'RETRY' }
    | { type: 'ABORT' }
    | { type: 'PAUSE' }
    | { type: 'RESUME' };

export const streamingMachine = createMachine(
    {
        id: 'streaming',
        types: {
            context: {} as StreamingContext,
            events: {} as StreamingEvent,
        },
        context: {
            timeout: 30000,
            maxRetries: 3,
            currentRetries: 0,
            buffer: '',
        },
        initial: 'idle',
        states: {
            idle: {
                on: {
                    START: {
                        target: 'connecting',
                        actions: 'initializeStreaming',
                    },
                },
            },
            connecting: {
                after: {
                    30000: {
                        target: 'timeout',
                        actions: 'setTimeoutError',
                    },
                },
                on: {
                    COMPLETE: 'completed',
                    ERROR: {
                        target: 'error',
                        actions: 'setError',
                    },
                    ABORT: {
                        target: 'aborted',
                        actions: 'cleanup',
                    },
                    TIMEOUT: {
                        target: 'timeout',
                        actions: 'setTimeoutError',
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
                                actions: 'pauseStream',
                            },
                        },
                    },
                    paused: {
                        on: {
                            RESUME: {
                                target: 'active',
                                actions: 'resumeStream',
                            },
                        },
                    },
                },
                on: {
                    CHUNK_RECEIVED: {
                        actions: 'processChunk',
                    },
                    MESSAGE_PARSED: {
                        actions: 'handleParsedMessage',
                    },
                    COMPLETE: {
                        target: 'completed',
                        actions: 'cleanup',
                    },
                    ERROR: {
                        target: 'error',
                        actions: 'setError',
                    },
                    ABORT: {
                        target: 'aborted',
                        actions: 'cleanup',
                    },
                },
            },
            completed: {
                type: 'final',
                entry: 'notifyComplete',
            },
            error: {
                on: {
                    RETRY: [
                        {
                            target: 'connecting',
                            guard: 'canRetry',
                            actions: ['incrementRetry', 'resetError'],
                        },
                        {
                            target: 'failed',
                        },
                    ],
                    ABORT: {
                        target: 'aborted',
                        actions: 'cleanup',
                    },
                },
            },
            timeout: {
                on: {
                    RETRY: [
                        {
                            target: 'connecting',
                            guard: 'canRetry',
                            actions: ['incrementRetry', 'resetTimeout'],
                        },
                        {
                            target: 'failed',
                        },
                    ],
                    ABORT: {
                        target: 'aborted',
                        actions: 'cleanup',
                    },
                },
            },
            failed: {
                type: 'final',
                entry: 'notifyFailed',
            },
            aborted: {
                type: 'final',
                entry: 'notifyAborted',
            },
        },
    },
    {
        actions: {
            initializeStreaming: assign(({ event }) => {
                if (event.type === 'START') {
                    return {
                        url: event.url,
                        headers: event.headers,
                        messageId: event.messageId,
                        currentRetries: 0,
                        buffer: '',
                        error: undefined,
                        abortController: new AbortController(),
                    };
                }
                return {};
            }),

            processChunk: assign(({ context, event }) => {
                if (event.type === 'CHUNK_RECEIVED') {
                    const decoder = new TextDecoder();
                    const chunk = decoder.decode(event.chunk, { stream: true });
                    return {
                        buffer: context.buffer + chunk,
                    };
                }
                return {};
            }),

            handleParsedMessage: assign(({ event }) => {
                if (event.type === 'MESSAGE_PARSED' && event.conversationId) {
                    return {
                        conversationId: event.conversationId,
                    };
                }
                return {};
            }),

            setError: assign(({ event }) => {
                if (event.type === 'ERROR') {
                    return {
                        error: event.error,
                    };
                }
                return {};
            }),

            setTimeoutError: assign(({ context }) => ({
                error: new Error(`Stream timed out after ${context.timeout}ms`),
            })),

            incrementRetry: assign(({ context }) => ({
                currentRetries: context.currentRetries + 1,
            })),

            resetError: assign(() => ({
                error: undefined,
            })),

            resetTimeout: assign(() => ({
                error: undefined,
            })),

            pauseStream: ({ context }) => {
                if (context.timeoutId) {
                    clearTimeout(context.timeoutId);
                }
            },

            resumeStream: () => {
                // Resume logic
            },

            cleanup: assign(({ context }) => {
                if (context.reader) {
                    context.reader.releaseLock();
                }
                if (context.timeoutId) {
                    clearTimeout(context.timeoutId);
                }
                if (context.abortController) {
                    context.abortController.abort();
                }
                return {
                    reader: undefined,
                    timeoutId: undefined,
                    abortController: undefined,
                    buffer: '',
                };
            }),

            notifyComplete: () => {
                // Notification logic
            },

            notifyFailed: () => {
                // Notification logic
            },

            notifyAborted: () => {
                // Notification logic
            },
        },

        guards: {
            canRetry: ({ context }) => context.currentRetries < context.maxRetries,
        },
    }
);

export type StreamingMachine = typeof streamingMachine;
