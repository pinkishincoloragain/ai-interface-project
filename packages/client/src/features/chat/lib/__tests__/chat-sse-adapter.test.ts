/**
 * Tests for ChatSSEAdapter class
 */

import { ChatSSEAdapter } from '../chat-sse-adapter';
import { SSEReader } from '../sse-reader';
import { ErrorType } from '../errors';

// Mock SSEReader
jest.mock('../sse-reader');
const MockSSEReader = SSEReader as jest.MockedClass<typeof SSEReader>;

describe('ChatSSEAdapter', () => {
    let mockSSEReader: jest.Mocked<SSEReader>;
    let mockResponse: Response;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSSEReader = {
            read: jest.fn(),
            cancel: jest.fn(),
            setHandlers: jest.fn(),
        } as any;

        MockSSEReader.mockImplementation(() => mockSSEReader);

        mockResponse = {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers({
                'content-type': 'text/event-stream',
            }),
        } as Response;
    });

    describe('Constructor and setup', () => {
        it('should create ChatSSEAdapter with default options', () => {
            const adapter = new ChatSSEAdapter();
            expect(adapter).toBeInstanceOf(ChatSSEAdapter);
            expect(MockSSEReader).toHaveBeenCalledWith({});
        });

        it('should create ChatSSEAdapter with custom options', () => {
            const options = {
                messageId: 'test-message-id',
                conversationId: 'test-conversation-id',
                timeout: 10000,
                autoRetry: false,
            };

            new ChatSSEAdapter(options);
            expect(MockSSEReader).toHaveBeenCalledWith(options);
        });

        it('should set up SSE reader handlers', () => {
            new ChatSSEAdapter();
            expect(mockSSEReader.setHandlers).toHaveBeenCalledWith(
                expect.objectContaining({
                    onMessage: expect.any(Function),
                    onError: expect.any(Function),
                    onComplete: expect.any(Function),
                    onTimeout: expect.any(Function),
                })
            );
        });
    });

    describe('Message handling', () => {
        it('should parse and emit valid SSE messages', () => {
            const onMessage = jest.fn();
            const adapter = new ChatSSEAdapter();
            adapter.setHandlers({ onMessage });

            // Get the handlers set on the SSE reader
            const sseHandlers = mockSSEReader.setHandlers.mock.calls[0][0];

            // Simulate a valid SSE message
            const rawMessage = {
                data: JSON.stringify({
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    content: 'Hello world',
                    role: 'assistant',
                    conversationId: '123e4567-e89b-12d3-a456-426614174001',
                    isDone: false,
                }),
            };

            sseHandlers.onMessage?.(rawMessage);

            expect(onMessage).toHaveBeenCalledWith({
                type: 'message',
                messageId: '123e4567-e89b-12d3-a456-426614174000',
                content: 'Hello world',
                conversationId: '123e4567-e89b-12d3-a456-426614174001',
                isDone: false,
            });
        });

        it('should handle invalid JSON gracefully', () => {
            const onError = jest.fn();
            const adapter = new ChatSSEAdapter();
            adapter.setHandlers({ onError });

            const sseHandlers = mockSSEReader.setHandlers.mock.calls[0][0];

            // Simulate invalid JSON
            const rawMessage = {
                data: 'invalid json {',
            };

            sseHandlers.onMessage?.(rawMessage);

            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'error',
                    error: expect.objectContaining({
                        type: ErrorType.PARSE_ERROR,
                    }),
                })
            );
        });

        it('should handle validation failures', () => {
            const onError = jest.fn();
            const adapter = new ChatSSEAdapter();
            adapter.setHandlers({ onError });

            const sseHandlers = mockSSEReader.setHandlers.mock.calls[0][0];

            // Simulate invalid message data (missing required fields)
            const rawMessage = {
                data: JSON.stringify({
                    id: 'invalid-id',
                    content: 'Hello world',
                    // Missing role, conversationId, isDone
                }),
            };

            sseHandlers.onMessage?.(rawMessage);

            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'error',
                    error: expect.objectContaining({
                        type: ErrorType.VALIDATION_ERROR,
                    }),
                })
            );
        });
    });

    describe('Error handling', () => {
        it('should forward SSE errors with user-friendly messages', () => {
            const onError = jest.fn();
            const adapter = new ChatSSEAdapter();
            adapter.setHandlers({ onError });

            const sseHandlers = mockSSEReader.setHandlers.mock.calls[0][0];

            // Simulate SSE error
            const sseError = {
                type: ErrorType.NETWORK_ERROR,
                message: 'Network connection failed',
                recoverable: true,
            } as any;

            sseHandlers.onError?.(sseError);

            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'error',
                    error: sseError,
                    userMessage: expect.stringContaining('네트워크 연결'),
                })
            );
        });
    });

    describe('Completion handling', () => {
        it('should emit completion events', () => {
            const onComplete = jest.fn();
            const adapter = new ChatSSEAdapter();
            adapter.setHandlers({ onComplete });

            const sseHandlers = mockSSEReader.setHandlers.mock.calls[0][0];

            sseHandlers.onComplete?.();

            expect(onComplete).toHaveBeenCalledWith({
                type: 'complete',
                conversationId: undefined,
            });
        });

        it('should include conversation ID in completion if available', () => {
            const onMessage = jest.fn();
            const onComplete = jest.fn();
            const adapter = new ChatSSEAdapter();
            adapter.setHandlers({ onMessage, onComplete });

            const sseHandlers = mockSSEReader.setHandlers.mock.calls[0][0];

            // First, process a message to set conversation ID
            const rawMessage = {
                data: JSON.stringify({
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    content: 'Hello world',
                    role: 'assistant',
                    conversationId: 'test-conversation-id',
                    isDone: false,
                }),
            };

            sseHandlers.onMessage?.(rawMessage);
            sseHandlers.onComplete?.();

            expect(onComplete).toHaveBeenCalledWith({
                type: 'complete',
                conversationId: 'test-conversation-id',
            });
        });
    });

    describe('Timeout handling', () => {
        it('should emit timeout events', () => {
            const onTimeout = jest.fn();
            const adapter = new ChatSSEAdapter({ messageId: 'test-message-id' });
            adapter.setHandlers({ onTimeout });

            const sseHandlers = mockSSEReader.setHandlers.mock.calls[0][0];

            sseHandlers.onTimeout?.();

            expect(onTimeout).toHaveBeenCalledWith({
                type: 'timeout',
                messageId: 'test-message-id',
            });
        });
    });

    describe('Streaming operations', () => {
        it('should delegate to SSE reader for streaming', async () => {
            const adapter = new ChatSSEAdapter();
            mockSSEReader.read.mockResolvedValueOnce(undefined);

            await adapter.stream(mockResponse);

            expect(mockSSEReader.read).toHaveBeenCalledWith(mockResponse);
        });

        it('should cancel SSE reader when cancelled', () => {
            const adapter = new ChatSSEAdapter();

            adapter.cancel();

            expect(mockSSEReader.cancel).toHaveBeenCalled();
        });
    });

    describe('State tracking', () => {
        it('should track latest conversation ID', () => {
            const adapter = new ChatSSEAdapter();
            adapter.setHandlers({});

            const sseHandlers = mockSSEReader.setHandlers.mock.calls[0][0];

            // Process message with conversation ID
            const rawMessage = {
                data: JSON.stringify({
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    content: 'Hello world',
                    role: 'assistant',
                    conversationId: 'test-conversation-id',
                    isDone: false,
                }),
            };

            sseHandlers.onMessage?.(rawMessage);

            expect(adapter.getLatestConversationId()).toBe('test-conversation-id');
        });

        it('should track retry attempts', () => {
            const adapter = new ChatSSEAdapter();

            expect(adapter.getCurrentAttempt()).toBe(0);

            adapter.resetRetryCount();
            expect(adapter.getCurrentAttempt()).toBe(0);
        });
    });
});
