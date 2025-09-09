/**
 * SSEReader - Protocol-level SSE stream handling
 * Focuses solely on SSE specification parsing and connection management
 * Domain-agnostic and reusable for different use cases
 */

import { createEnhancedError, ErrorType, type EnhancedError } from './errors';

/**
 * Raw SSE message as per SSE specification
 * Contains only protocol-level fields without domain knowledge
 */
export interface RawSSEMessage {
    /** Event type (optional) */
    event?: string;
    /** Event ID for last-event-id (optional) */
    id?: string;
    /** Retry timeout in milliseconds (optional) */
    retry?: number;
    /** Event data payload */
    data: string;
}

/**
 * SSE Reader events
 */
export type SSEReaderEvent =
    | { type: 'message'; message: RawSSEMessage }
    | { type: 'error'; error: EnhancedError }
    | { type: 'complete' }
    | { type: 'timeout' };

/**
 * SSE Reader configuration options
 */
export interface SSEReaderOptions {
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Abort signal for cancellation */
    abortSignal?: AbortSignal;
    /** Custom headers for the request */
    headers?: Record<string, string>;
    /** Enable automatic retry on failure */
    enableRetry?: boolean;
    /** Maximum retry attempts */
    maxRetries?: number;
}

/**
 * SSE Reader event handlers
 */
export interface SSEReaderHandlers {
    onMessage?: (message: RawSSEMessage) => void;
    onError?: (error: EnhancedError) => void;
    onComplete?: () => void;
    onTimeout?: () => void;
}

/**
 * SSEReader class - handles low-level SSE protocol parsing
 *
 * Responsibilities:
 * - SSE specification compliance (event, id, data, retry fields)
 * - Stream reading and text decoding
 * - Line-by-line parsing with proper boundary handling
 * - Timeout and abort signal management
 * - Connection lifecycle management
 *
 * Does NOT handle:
 * - Domain-specific message parsing (JSON, validation)
 * - Business logic or state management
 * - Message content interpretation
 */
export class SSEReader {
    private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    private decoder = new TextDecoder();
    private buffer = '';
    private timeoutId: NodeJS.Timeout | null = null;
    private isComplete = false;
    private completionHandled = false;
    private handlers: SSEReaderHandlers = {};

    constructor(private options: SSEReaderOptions = {}) {}

    /**
     * Sets event handlers for the SSE reader
     */
    setHandlers(handlers: SSEReaderHandlers): void {
        this.handlers = handlers;
    }

    /**
     * Starts reading from an SSE response stream
     */
    async read(response: Response): Promise<void> {
        this.validateResponse(response);

        if (!response.body) {
            throw createEnhancedError(ErrorType.NETWORK_ERROR, 'Response body is null', { recoverable: false });
        }

        this.reader = response.body.getReader();
        this.setupTimeout();
        this.setupAbortHandler();

        try {
            await this.processStream();
            this.handleComplete();
        } catch (error) {
            this.handleError(error as Error);
        }
    }

    /**
     * Cancels the SSE reading process
     */
    cancel(): void {
        this.isComplete = true;
        this.completionHandled = true;
        this.cleanup();
    }

    /**
     * Validates the response for SSE compatibility
     */
    private validateResponse(response: Response): void {
        if (!response.ok) {
            throw createEnhancedError(ErrorType.SERVER_ERROR, `HTTP ${response.status}: ${response.statusText}`, {
                recoverable: response.status >= 500,
                context: { status: response.status, statusText: response.statusText },
            });
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('text/event-stream')) {
            console.warn('Response content-type is not text/event-stream:', contentType);
        }
    }

    /**
     * Sets up timeout handling
     */
    private setupTimeout(): void {
        const timeout = this.options.timeout ?? 30000;

        this.timeoutId = setTimeout(() => {
            if (!this.isComplete) {
                this.handleTimeout();
            }
        }, timeout);
    }

    /**
     * Sets up abort signal handling
     */
    private setupAbortHandler(): void {
        if (this.options.abortSignal) {
            this.options.abortSignal.addEventListener('abort', () => {
                this.handleAbort();
            });
        }
    }

    /**
     * Main stream processing loop
     */
    private async processStream(): Promise<void> {
        if (!this.reader) return;

        while (!this.isComplete) {
            // Check abort signal before each read
            if (this.options.abortSignal?.aborted) {
                this.handleAbort();
                return;
            }

            const { done, value } = await this.reader.read();

            if (done) break;

            // Decode chunk and add to buffer
            this.buffer += this.decoder.decode(value, { stream: true });

            // Process complete lines
            this.processLines();
        }
    }

    /**
     * Processes complete lines from the buffer
     */
    private processLines(): void {
        const lines = this.buffer.split('\n');

        // Keep the last incomplete line in the buffer
        this.buffer = lines.pop() || '';

        for (const line of lines) {
            this.processLine(line);
        }
    }

    /**
     * Processes a single SSE line according to the specification
     */
    private processLine(line: string): void {
        const trimmedLine = line.trim();

        // Empty line indicates end of event
        if (trimmedLine === '') {
            return;
        }

        // Comments (lines starting with :)
        if (trimmedLine.startsWith(':')) {
            return;
        }

        // Parse field and value
        const colonIndex = trimmedLine.indexOf(':');

        if (colonIndex === -1) {
            // Line without colon is treated as field with empty value
            this.processField(trimmedLine, '');
        } else {
            const field = trimmedLine.slice(0, colonIndex);
            const value = trimmedLine.slice(colonIndex + 1).trim();
            this.processField(field, value);
        }
    }

    /**
     * Processes SSE field according to specification
     */
    private processField(field: string, value: string): void {
        switch (field) {
            case 'data':
                this.handleDataField(value);
                break;
            case 'event':
                // Event type handling can be implemented here
                break;
            case 'id':
                // Event ID handling can be implemented here
                break;
            case 'retry':
                // Retry interval handling can be implemented here
                break;
            default:
                // Unknown fields are ignored per SSE spec
                break;
        }
    }

    /**
     * Handles data field - the main content of SSE messages
     */
    private handleDataField(value: string): void {
        // Handle special termination signal
        if (value === '[DONE]') {
            this.isComplete = true;
            this.handleComplete();
            return;
        }

        try {
            const message: RawSSEMessage = {
                data: value,
            };

            this.handlers.onMessage?.(message);

            // Emit message event
            this.emit({ type: 'message', message });
        } catch (error) {
            const enhancedError = createEnhancedError(ErrorType.PARSE_ERROR, 'Failed to create SSE message', {
                cause: error as Error,
                context: { rawData: value },
            });

            this.handleError(enhancedError);
        }
    }

    /**
     * Handles successful completion
     */
    private handleComplete(): void {
        if (this.completionHandled) return;

        this.completionHandled = true;
        this.isComplete = true;
        this.cleanup();

        this.handlers.onComplete?.();
        this.emit({ type: 'complete' });
    }

    /**
     * Handles timeout scenarios
     */
    private handleTimeout(): void {
        const timeoutError = createEnhancedError(
            ErrorType.TIMEOUT_ERROR,
            `SSE stream timed out after ${this.options.timeout ?? 30000}ms`,
            { recoverable: true }
        );

        this.isComplete = true;
        this.completionHandled = true;
        this.cleanup();

        this.handlers.onTimeout?.();
        this.emit({ type: 'timeout' });
        this.handleError(timeoutError);
    }

    /**
     * Handles abort scenarios
     */
    private handleAbort(): void {
        const abortError = createEnhancedError(ErrorType.ABORT_ERROR, 'SSE stream was aborted', { recoverable: false });

        this.isComplete = true;
        this.completionHandled = true;

        // Process any remaining content in buffer before cleanup
        if (this.buffer.trim()) {
            this.processLines();
        }

        this.cleanup();
        this.handleError(abortError);
    }

    /**
     * Handles error scenarios
     */
    private handleError(error: Error | EnhancedError): void {
        const enhancedError =
            error instanceof Error && 'type' in error
                ? (error as EnhancedError)
                : createEnhancedError(ErrorType.NETWORK_ERROR, error.message, { cause: error });

        this.cleanup();

        this.handlers.onError?.(enhancedError);
        this.emit({ type: 'error', error: enhancedError });
    }

    /**
     * Emits events (for potential event emitter pattern)
     */
    private emit(_event: SSEReaderEvent): void {
        // This could be extended to support event emitter pattern
        // For now, handlers are called directly
    }

    /**
     * Cleans up resources
     */
    private cleanup(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        if (this.reader) {
            try {
                this.reader.cancel();
            } catch {
                // Reader might already be closed, ignore errors
                // This is expected when stream is already closed
            }
            this.reader.releaseLock();
            this.reader = null;
        }

        this.buffer = '';
    }
}
