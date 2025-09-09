import { createChatSSEAdapter } from '../lib/chat-sse-adapter';

export interface StreamingConfig {
    messageId: string;
    conversationId?: string;
    timeout?: number;
    autoRetry?: boolean;
    abortSignal?: AbortSignal;
}

export interface StreamingCallbacks {
    onMessage: (content: string, isDone: boolean, messageId: string) => void;
    onError: (error: string) => void;
    onComplete: (conversationId?: string) => void;
    onTimeout: () => void;
}

/**
 * Service responsible for managing chat message streaming
 * Following SRP: Only handles streaming logic, no UI concerns
 */
export class StreamingService {
    private adapter: ReturnType<typeof createChatSSEAdapter> | null = null;
    private abortController: AbortController | null = null;

    async startStream(
        response: Response,
        config: StreamingConfig,
        callbacks: StreamingCallbacks
    ): Promise<string | undefined> {
        // Use provided abort signal or create new one
        this.abortController = config.abortSignal ? null : new AbortController();
        const abortSignal = config.abortSignal || this.abortController!.signal;

        this.adapter = createChatSSEAdapter({
            messageId: config.messageId,
            conversationId: config.conversationId,
            timeout: config.timeout ?? 60000,
            autoRetry: config.autoRetry ?? true,
            abortSignal: abortSignal,
            retryConfig: {
                maxAttempts: 3,
                initialDelay: 1000,
                maxDelay: 10000,
                backoffMultiplier: 2,
            },
        });

        this.adapter.setHandlers({
            onMessage: (event) => {
                if (event.content !== undefined) {
                    callbacks.onMessage(event.content, event.isDone || false, event.messageId);
                }
            },
            onError: (event) => {
                callbacks.onError(event.userMessage || '오류가 발생했습니다.');
            },
            onComplete: (event) => {
                callbacks.onComplete(event.conversationId);
            },
            onTimeout: () => {
                callbacks.onTimeout();
            },
            onRetry: (_event) => {
                // Could be extended for retry UI feedback
            },
        });

        return this.adapter.stream(response);
    }

    stopStream(): void {
        // Cancel the adapter first to allow content processing
        if (this.adapter) {
            this.adapter.cancel();
            this.adapter = null;
        }

        // Then abort the request signal
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}

// Singleton instance for the application
export const streamingService = new StreamingService();
