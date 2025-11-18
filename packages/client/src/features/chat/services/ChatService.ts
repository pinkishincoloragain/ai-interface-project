import { chatApi } from '../api/chatApi';
import { messageService, MessageService } from './MessageService';
import { streamingService, StreamingService } from './StreamingService';
import { useChatStore } from '../model/store';

export interface SendMessageParams {
    content: string;
    threadId?: string;
}

export interface ChatServiceDependencies {
    messageService: MessageService;
    streamingService: StreamingService;
}

/**
 * Main chat service that orchestrates message sending and streaming
 * Following SRP: Coordinates between message and streaming services
 */
export class ChatService {
    private abortController: AbortController | null = null;
    private currentStreamingMessageId: string | null = null;
    private navigationAbortHandler: (() => void) | null = null;
    private beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | null = null;

    constructor(
        private messageService: MessageService,
        private streamingService: StreamingService
    ) {}

    async sendMessage({ content, threadId }: SendMessageParams): Promise<string | undefined> {
        const { setLoading, setCurrentThreadId, currentThreadId } = useChatStore.getState();

        // Create new AbortController for this request
        this.abortController = new AbortController();
        setLoading(true);

        // Track the final conversation ID
        let finalConversationId: string | undefined = threadId || currentThreadId;

        try {
            // Create and add user message
            const userMessage = this.messageService.createUserMessage(content);
            this.messageService.addMessage(userMessage);

            // Create assistant placeholder
            const assistantPlaceholder = this.messageService.createAssistantPlaceholder();
            this.messageService.addMessage(assistantPlaceholder);

            // Track current streaming message and set up navigation handlers
            this.currentStreamingMessageId = assistantPlaceholder.id;
            this.setupNavigationAbortHandlers();

            // Prepare request with successful messages
            const successfulMessages = this.messageService.getSuccessfulMessages();
            const requestMessages = [...successfulMessages, userMessage];

            // Send API request with abort signal
            const effectiveThreadId = threadId || currentThreadId;
            const response = await chatApi.sendMessage(
                requestMessages,
                effectiveThreadId,
                assistantPlaceholder.id,
                this.abortController.signal
            );

            // Start streaming with callbacks
            const streamPromise = this.streamingService.startStream(
                response,
                {
                    messageId: assistantPlaceholder.id,
                    conversationId: effectiveThreadId,
                    abortSignal: this.abortController.signal,
                },
                {
                    onMessage: (content, isDone, messageId) => {
                        this.messageService.updateMessageContent(messageId, content, isDone);
                    },
                    onError: (errorMessage) => {
                        setLoading(false);

                        // Handle abort errors specially - preserve content instead of marking as error
                        if (errorMessage.includes('abort') || errorMessage.includes('취소')) {
                            this.messageService.markMessageAsStopped(assistantPlaceholder.id);
                        } else {
                            this.messageService.markMessageAsError(assistantPlaceholder.id, errorMessage);
                        }

                        this.currentStreamingMessageId = null;
                        this.removeNavigationAbortHandlers();
                    },
                    onComplete: (conversationId) => {
                        setLoading(false);
                        this.messageService.markMessageAsSuccess(assistantPlaceholder.id);
                        this.currentStreamingMessageId = null;
                        this.removeNavigationAbortHandlers();

                        if (conversationId && !currentThreadId) {
                            setCurrentThreadId(conversationId);
                            finalConversationId = conversationId;
                        }
                    },
                    onTimeout: () => {
                        setLoading(false);
                        this.messageService.markMessageAsError(
                            assistantPlaceholder.id,
                            '요청 시간이 초과되었습니다. 다시 시도해주세요.'
                        );
                        this.currentStreamingMessageId = null;
                        this.removeNavigationAbortHandlers();
                    },
                }
            );

            // Add fallback timeout
            const fallbackTimeout = setTimeout(() => {
                setLoading(false);
            }, 65000);

            streamPromise.finally(() => {
                clearTimeout(fallbackTimeout);
                setLoading(false);
                // Clean up abort controller when stream completes
                this.abortController = null;
                this.currentStreamingMessageId = null;
                this.removeNavigationAbortHandlers();
            });

            await streamPromise;
            return finalConversationId;
        } catch (error) {
            setLoading(false);
            // Clean up abort controller on error
            this.abortController = null;

            // If error is from fetch abort (HTTP level), preserve content and mark as stopped
            if (error instanceof Error && error.name === 'AbortError') {
                if (this.currentStreamingMessageId) {
                    this.messageService.markMessageAsStopped(this.currentStreamingMessageId);
                    this.currentStreamingMessageId = null;
                }
                return threadId || currentThreadId;
            }

            // Handle error for any assistant message in sending state
            const sendingMessage = useChatStore
                .getState()
                .messages.find((m) => m.role === 'assistant' && m.status === 'sending');

            if (sendingMessage) {
                this.messageService.markMessageAsError(sendingMessage.id);
            }

            this.currentStreamingMessageId = null;
            this.removeNavigationAbortHandlers();
            throw error;
        }
    }

    stopStreaming(): void {
        // Mark current message as stopped (preserving content)
        if (this.currentStreamingMessageId) {
            this.messageService.markMessageAsStopped(this.currentStreamingMessageId);
        }

        // Abort the HTTP request
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        // Stop the streaming service
        this.streamingService.stopStream();

        // Update UI state
        useChatStore.getState().setLoading(false);
        this.currentStreamingMessageId = null;
        this.removeNavigationAbortHandlers();
    }

    /**
     * Sets up event listeners to handle navigation/tab closure during streaming
     */
    private setupNavigationAbortHandlers(): void {
        // Handle navigation within the SPA (like browser back/forward)
        this.navigationAbortHandler = () => {
            if (this.currentStreamingMessageId) {
                this.stopStreaming();
            }
        };

        // Handle tab closure or navigation to different domain
        this.beforeUnloadHandler = (_event: BeforeUnloadEvent) => {
            if (this.currentStreamingMessageId) {
                this.stopStreaming();
                // Note: We don't show confirmation dialog as it would be annoying
                // The abort will happen automatically
            }
        };

        // Add event listeners
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', this.beforeUnloadHandler);
            window.addEventListener('pagehide', this.navigationAbortHandler);
            // Also listen for popstate (browser navigation)
            window.addEventListener('popstate', this.navigationAbortHandler);
        }
    }

    /**
     * Removes navigation event listeners
     */
    private removeNavigationAbortHandlers(): void {
        if (typeof window !== 'undefined' && this.navigationAbortHandler && this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            window.removeEventListener('pagehide', this.navigationAbortHandler);
            window.removeEventListener('popstate', this.navigationAbortHandler);
        }

        this.navigationAbortHandler = null;
        this.beforeUnloadHandler = null;
    }

    /**
     * Global cleanup method - can be called manually if needed
     * Useful for component unmounting or manual cleanup
     */
    public cleanup(): void {
        if (this.currentStreamingMessageId) {
            this.stopStreaming();
        }
        this.removeNavigationAbortHandlers();
    }

    /**
     * Check if currently streaming (useful for external components)
     */
    public isStreaming(): boolean {
        return this.currentStreamingMessageId !== null;
    }
}

// Configured singleton instance for the application
export const chatService = new ChatService(messageService, streamingService);
