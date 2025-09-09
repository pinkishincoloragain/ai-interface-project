/**
 * Tests for SSEReader class
 */

import { SSEReader } from '../sse-reader';
import { ErrorType } from '../errors';

// Mock TextDecoder
global.TextDecoder = class {
    decode(data: Uint8Array): string {
        return Buffer.from(data).toString('utf-8');
    }
} as any;

describe('SSEReader', () => {
    let mockReader: any;
    let mockResponse: Response;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReader = {
            read: jest.fn(),
            releaseLock: jest.fn(),
        };

        mockResponse = {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers({
                'content-type': 'text/event-stream',
            }),
            body: {
                getReader: () => mockReader,
            },
        } as any;
    });

    describe('Constructor and basic setup', () => {
        it('should create SSEReader with default options', () => {
            const reader = new SSEReader();
            expect(reader).toBeInstanceOf(SSEReader);
        });

        it('should create SSEReader with custom options', () => {
            const options = {
                timeout: 10000,
                enableRetry: true,
            };
            const reader = new SSEReader(options);
            expect(reader).toBeInstanceOf(SSEReader);
        });
    });

    describe('Response validation', () => {
        it('should reject non-ok responses', async () => {
            const badResponse = {
                ...mockResponse,
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            } as Response;

            const reader = new SSEReader();

            await expect(reader.read(badResponse)).rejects.toThrow();
        });

        it('should reject responses without body', async () => {
            const noBodyResponse = {
                ...mockResponse,
                body: null,
            } as Response;

            const reader = new SSEReader();

            await expect(reader.read(noBodyResponse)).rejects.toThrow('Response body is null');
        });

        it('should warn about incorrect content-type', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const wrongContentTypeResponse = {
                ...mockResponse,
                headers: new Headers({
                    'content-type': 'application/json',
                }),
            } as Response;

            // Make the reader complete immediately
            mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

            const reader = new SSEReader();
            await reader.read(wrongContentTypeResponse);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Response content-type is not text/event-stream:',
                'application/json'
            );

            consoleSpy.mockRestore();
        });
    });

    describe('SSE message parsing', () => {
        it('should parse simple data messages', async () => {
            const onMessage = jest.fn();
            const reader = new SSEReader();
            reader.setHandlers({ onMessage });

            // Simulate SSE data
            const sseData = 'data: Hello world\n\n';
            const chunks = [new TextEncoder().encode(sseData)];

            mockReader.read
                .mockResolvedValueOnce({ done: false, value: chunks[0] })
                .mockResolvedValueOnce({ done: true, value: undefined });

            await reader.read(mockResponse);

            expect(onMessage).toHaveBeenCalledWith({
                data: 'Hello world',
            });
        });

        it('should handle [DONE] signal', async () => {
            const onComplete = jest.fn();
            const reader = new SSEReader();
            reader.setHandlers({ onComplete });

            const sseData = 'data: [DONE]\n\n';
            const chunks = [new TextEncoder().encode(sseData)];

            mockReader.read
                .mockResolvedValueOnce({ done: false, value: chunks[0] })
                .mockResolvedValueOnce({ done: true, value: undefined });

            await reader.read(mockResponse);

            expect(onComplete).toHaveBeenCalled();
        });

        it('should ignore comments and empty lines', async () => {
            const onMessage = jest.fn();
            const reader = new SSEReader();
            reader.setHandlers({ onMessage });

            const sseData = ': This is a comment\n\ndata: Real message\n\n';
            const chunks = [new TextEncoder().encode(sseData)];

            mockReader.read
                .mockResolvedValueOnce({ done: false, value: chunks[0] })
                .mockResolvedValueOnce({ done: true, value: undefined });

            await reader.read(mockResponse);

            expect(onMessage).toHaveBeenCalledTimes(1);
            expect(onMessage).toHaveBeenCalledWith({
                data: 'Real message',
            });
        });

        it('should handle multi-chunk data', async () => {
            const onMessage = jest.fn();
            const reader = new SSEReader();
            reader.setHandlers({ onMessage });

            // Split SSE message across multiple chunks
            const chunk1 = new TextEncoder().encode('data: Hello ');
            const chunk2 = new TextEncoder().encode('world\n\n');

            mockReader.read
                .mockResolvedValueOnce({ done: false, value: chunk1 })
                .mockResolvedValueOnce({ done: false, value: chunk2 })
                .mockResolvedValueOnce({ done: true, value: undefined });

            await reader.read(mockResponse);

            expect(onMessage).toHaveBeenCalledWith({
                data: 'Hello world',
            });
        });
    });

    describe('Error handling', () => {
        it('should handle stream reading errors', async () => {
            const onError = jest.fn();
            const reader = new SSEReader();
            reader.setHandlers({ onError });

            const streamError = new Error('Stream read failed');
            mockReader.read.mockRejectedValueOnce(streamError);

            await reader.read(mockResponse);

            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: ErrorType.NETWORK_ERROR,
                    cause: streamError,
                })
            );
        });

        it('should handle timeout', async () => {
            jest.useFakeTimers();

            const onTimeout = jest.fn();
            const reader = new SSEReader({ timeout: 1000 });
            reader.setHandlers({ onTimeout });

            // Never resolve the read promise
            mockReader.read.mockImplementation(() => new Promise(() => {}));

            reader.read(mockResponse);

            // Fast-forward time to trigger timeout
            jest.advanceTimersByTime(1000);

            await Promise.resolve(); // Let timeout handler execute

            expect(onTimeout).toHaveBeenCalled();

            jest.useRealTimers();
        });

        it('should handle abort signal', async () => {
            const controller = new AbortController();
            const onError = jest.fn();

            const reader = new SSEReader({
                abortSignal: controller.signal,
            });
            reader.setHandlers({ onError });

            // Start reading
            mockReader.read.mockImplementation(() => new Promise(() => {}));
            reader.read(mockResponse);

            // Abort the request
            controller.abort();

            await Promise.resolve(); // Let abort handler execute

            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: ErrorType.ABORT_ERROR,
                })
            );
        });
    });

    describe('Cleanup', () => {
        it('should clean up resources on completion', async () => {
            jest.useFakeTimers();

            const reader = new SSEReader({ timeout: 5000 });

            mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

            await reader.read(mockResponse);

            expect(mockReader.releaseLock).toHaveBeenCalled();

            jest.useRealTimers();
        });

        it('should clean up resources on cancel', () => {
            jest.useFakeTimers();

            const reader = new SSEReader({ timeout: 5000 });

            // Start a read operation
            mockReader.read.mockImplementation(() => new Promise(() => {}));
            reader.read(mockResponse);

            // Cancel the operation
            reader.cancel();

            expect(mockReader.releaseLock).toHaveBeenCalled();

            jest.useRealTimers();
        });
    });
});
