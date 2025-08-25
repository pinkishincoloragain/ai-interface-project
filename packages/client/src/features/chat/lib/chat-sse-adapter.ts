/**
 * ChatSSEAdapter - Domain-specific SSE message handling
 * Handles chat-specific business logic, message parsing, and state management
 * Works with SSEReader to provide a complete streaming solution
 */

import { SSEReader, type RawSSEMessage, type SSEReaderOptions } from './sse-reader';
import { validateSSEMessageData, safeParseSSEMessageData } from './schemas';
import {
    createEnhancedError,
    ErrorType,
    getUserFriendlyMessage,
    shouldRetry,
    calculateRetryDelay,
    type EnhancedError,
    type RetryConfig,
    DEFAULT_RETRY_CONFIG,
} from './errors';

/**
 * Chat-specific streaming events
 */
export type ChatStreamingEvent =
    | {
          type: 'message';
          messageId: string;
          content: string;
          conversationId: string;
          isDone: boolean;
      }
    | {
          type: 'error';
          error: EnhancedError;
          userMessage: string;
      }
    | {
          type: 'complete';
          conversationId?: string;
      }
    | {
          type: 'timeout';
          messageId?: string;
      }
    | {
          type: 'retry';
          attempt: number;
          nextRetryIn: number;
      };

/**
 * Chat SSE Adapter configuration
 */
export interface ChatSSEAdapterOptions extends SSEReaderOptions {
    /** Current message ID for state tracking */
    messageId?: string;
    /** Current conversation ID */
    conversationId?: string;
    /** Retry configuration */
    retryConfig?: Partial<RetryConfig>;
    /** Enable automatic retry on recoverable errors */
    autoRetry?: boolean;
}

/**
 * Chat SSE Adapter event handlers
 */
export interface ChatSSEAdapterHandlers {
    onMessage?: (event: ChatStreamingEvent & { type: 'message' }) => void;
    onError?: (event: ChatStreamingEvent & { type: 'error' }) => void;
    onComplete?: (event: ChatStreamingEvent & { type: 'complete' }) => void;
    onTimeout?: (event: ChatStreamingEvent & { type: 'timeout' }) => void;
    onRetry?: (event: ChatStreamingEvent & { type: 'retry' }) => void;
}

/**
 * ChatSSEAdapter class - handles chat-specific SSE streaming logic
 *
 * Responsibilities:
 * - JSON parsing and validation of chat messages
 * - Chat domain state tracking (messageId, conversationId)
 * - Error classification and user-friendly error messages
 * - Automatic retry logic for recoverable errors
 * - Chat-specific event emission
 *
 * Works with SSEReader to provide separation of concerns:
 * - SSEReader: Protocol-level SSE handling
 * - ChatSSEAdapter: Chat business logic and domain concerns
 */
export class ChatSSEAdapter {
    private sseReader: SSEReader;
    private handlers: ChatSSEAdapterHandlers = {};
    private retryConfig: RetryConfig;
    private currentAttempt = 0;
    private latestConversationId?: string;

    constructor(private options: ChatSSEAdapterOptions = {}) {
        this.sseReader = new SSEReader(options);
        this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };
        this.setupSSEReaderHandlers();
    }

    /**
     * Sets event handlers for the chat adapter
     */
    setHandlers(handlers: ChatSSEAdapterHandlers): void {
        this.handlers = handlers;
    }

    /**
     * Starts streaming from the given response
     */
    async stream(response: Response): Promise<string | undefined> {
        return this.attemptStream(response);
    }

    /**
     * Cancels the current streaming operation
     */
    cancel(): void {
        this.sseReader.cancel();
    }

    /**
     * Attempts to stream with retry logic
     */
    private async attemptStream(response: Response, isRetry = false): Promise<string | undefined> {
        try {
            this.currentAttempt++;

            if (isRetry) {
                this.emitRetryEvent();
            }

            await this.sseReader.read(response);
            return this.latestConversationId;
        } catch (error) {
            const enhancedError = this.enhanceError(error as Error);

            // Check if we should retry
            if (this.shouldRetryError(enhancedError)) {
                const delay = calculateRetryDelay(this.currentAttempt, this.retryConfig);

                // Wait for the calculated delay
                await this.delay(delay);

                // Retry with a new response (would need to be provided)
                // Note: In a real implementation, you'd need a way to recreate the request
                throw enhancedError; // For now, we'll just throw to indicate retry needed
            }

            throw enhancedError;
        }
    }

    /**
     * Sets up handlers for the underlying SSEReader
     */
    private setupSSEReaderHandlers(): void {
        this.sseReader.setHandlers({
            onMessage: this.handleSSEMessage.bind(this),
            onError: this.handleSSEError.bind(this),
            onComplete: this.handleSSEComplete.bind(this),
            onTimeout: this.handleSSETimeout.bind(this),
        });
    }

    /**
     * Handles raw SSE messages and converts them to chat events
     */
    private handleSSEMessage(rawMessage: RawSSEMessage): void {
        try {
            // Parse and validate the JSON data
            const messageData = safeParseSSEMessageData(JSON.parse(rawMessage.data));

            if (!messageData) {
                const validationResult = validateSSEMessageData(JSON.parse(rawMessage.data));
                throw createEnhancedError(ErrorType.VALIDATION_ERROR, 'Invalid message data format', {
                    context: {
                        validationError: validationResult.error,
                        rawData: rawMessage.data,
                    },
                });
            }

            // Update conversation ID tracking
            this.latestConversationId = messageData.conversationId;

            // Create chat streaming event
            const chatEvent: ChatStreamingEvent & { type: 'message' } = {
                type: 'message',
                messageId: messageData.id,
                content: messageData.content,
                conversationId: messageData.conversationId,
                isDone: messageData.isDone,
            };

            // Emit to handlers
            this.handlers.onMessage?.(chatEvent);
        } catch (error) {
            const enhancedError = createEnhancedError(ErrorType.PARSE_ERROR, 'Failed to parse chat message', {
                cause: error as Error,
                context: { rawData: rawMessage.data },
            });

            this.handleSSEError(enhancedError);
        }
    }

    /**
     * Handles SSE errors and converts them to chat error events
     */
    private handleSSEError(error: EnhancedError): void {
        const chatEvent: ChatStreamingEvent & { type: 'error' } = {
            type: 'error',
            error,
            userMessage: getUserFriendlyMessage(error),
        };

        this.handlers.onError?.(chatEvent);
    }

    /**
     * Handles SSE completion
     */
    private handleSSEComplete(): void {
        const chatEvent: ChatStreamingEvent & { type: 'complete' } = {
            type: 'complete',
            conversationId: this.latestConversationId,
        };

        this.handlers.onComplete?.(chatEvent);
    }

    /**
     * Handles SSE timeout
     */
    private handleSSETimeout(): void {
        const chatEvent: ChatStreamingEvent & { type: 'timeout' } = {
            type: 'timeout',
            messageId: this.options.messageId,
        };

        this.handlers.onTimeout?.(chatEvent);
    }

    /**
     * Enhances generic errors with better classification
     */
    private enhanceError(error: Error): EnhancedError {
        if ('type' in error) {
            return error as EnhancedError;
        }

        // Try to classify the error based on its message
        const errorType = this.classifyErrorMessage(error.message);

        return createEnhancedError(errorType, error.message, { cause: error });
    }

    /**
     * Classifies errors based on their message content
     */
    private classifyErrorMessage(message: string): ErrorType {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('timeout')) return ErrorType.TIMEOUT_ERROR;
        if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) return ErrorType.NETWORK_ERROR;
        if (lowerMessage.includes('parse') || lowerMessage.includes('json')) return ErrorType.PARSE_ERROR;
        if (lowerMessage.includes('validation') || lowerMessage.includes('schema')) return ErrorType.VALIDATION_ERROR;
        if (lowerMessage.includes('abort')) return ErrorType.ABORT_ERROR;

        return ErrorType.SERVER_ERROR;
    }

    /**
     * Determines if an error should trigger a retry
     */
    private shouldRetryError(error: EnhancedError): boolean {
        return this.options.autoRetry !== false && shouldRetry(error, this.currentAttempt, this.retryConfig);
    }

    /**
     * Emits a retry event
     */
    private emitRetryEvent(): void {
        const nextDelay = calculateRetryDelay(this.currentAttempt + 1, this.retryConfig);

        const retryEvent: ChatStreamingEvent & { type: 'retry' } = {
            type: 'retry',
            attempt: this.currentAttempt,
            nextRetryIn: nextDelay,
        };

        this.handlers.onRetry?.(retryEvent);
    }

    /**
     * Utility method to create a delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Gets the current retry attempt count
     */
    getCurrentAttempt(): number {
        return this.currentAttempt;
    }

    /**
     * Resets the retry attempt count
     */
    resetRetryCount(): void {
        this.currentAttempt = 0;
    }

    /**
     * Gets the latest conversation ID
     */
    getLatestConversationId(): string | undefined {
        return this.latestConversationId;
    }
}

/**
 * Factory function to create a ChatSSEAdapter with default configuration
 */
export function createChatSSEAdapter(options: ChatSSEAdapterOptions = {}): ChatSSEAdapter {
    return new ChatSSEAdapter(options);
}
