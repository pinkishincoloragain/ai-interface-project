import { fromCallback, fromPromise } from 'xstate';
import type { StreamingContext, StreamingEvent } from './streamingMachine';

export const streamingServices = {
    connectToStream: fromPromise(async ({ input }: { input: StreamingContext }) => {
        const { url, headers, abortController } = input;

        if (!url) {
            throw new Error('URL is required for streaming');
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
                'Cache-Control': 'no-cache',
                ...headers,
            },
            signal: abortController?.signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error('Response body is null');
        }

        const reader = response.body.getReader();

        return { reader, response };
    }),

    readStream: fromCallback(
        ({ input, sendBack }: { input: StreamingContext; sendBack: (event: StreamingEvent) => void }) => {
            const { reader } = input;

            if (!reader) {
                sendBack({ type: 'ERROR', error: new Error('Reader not available') });
                return;
            }

            const processStream = async () => {
                try {
                    let { buffer } = input;
                    const decoder = new TextDecoder();
                    const doStream = true;

                    while (doStream) {
                        const { done, value } = await reader.read();

                        if (done) {
                            sendBack({ type: 'COMPLETE' });
                            break;
                        }

                        if (value) {
                            sendBack({ type: 'CHUNK_RECEIVED', chunk: value });

                            // Process chunk
                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';

                            for (const line of lines) {
                                const parsed = parseSSELine(line);
                                if (parsed) {
                                    sendBack(parsed);
                                }
                            }
                        }
                    }
                } catch (error) {
                    sendBack({
                        type: 'ERROR',
                        error: error instanceof Error ? error : new Error('Unknown streaming error'),
                    });
                }
            };

            processStream();

            // Cleanup function
            return () => {
                reader.releaseLock();
            };
        }
    ),
};

function parseSSELine(line: string): StreamingEvent | null {
    const trimmedLine = line.trim();

    if (trimmedLine === '' || trimmedLine.startsWith(':')) {
        return null;
    }

    if (trimmedLine.startsWith('data: ')) {
        const data = trimmedLine.slice(6).trim();

        if (data === '[DONE]') {
            return { type: 'COMPLETE' };
        }

        try {
            const parsed = JSON.parse(data);
            return {
                type: 'MESSAGE_PARSED',
                data,
                messageId: parsed.id,
                conversationId: parsed.conversationId,
            };
        } catch {
            return {
                type: 'ERROR',
                error: new Error(`Failed to parse SSE data: ${data}`),
            };
        }
    }

    if (trimmedLine.startsWith('event: error')) {
        return {
            type: 'ERROR',
            error: new Error('SSE Error event received'),
        };
    }

    return null;
}
