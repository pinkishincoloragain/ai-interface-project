import { useEffect, useCallback } from 'react';
import { useSimpleChatMachine } from '../model/useSimpleChatMachine';
import { useThreadMessagesQuery, useThreadsQuery } from '@/features/thread';

export const useChatViewModelXState = (threadId?: string) => {
    const {
        messages,
        currentThreadId,
        isLoading,
        isStreaming,
        isPaused,
        error,
        sendMessage,
        retryStream,
        abortStream,
        pauseStream,
        resumeStream,
        loadMessages,
        clearMessages,
        setThread,
    } = useSimpleChatMachine();

    const threadMessagesQuery = useThreadMessagesQuery(threadId);
    useThreadsQuery();

    // Handle thread changes
    useEffect(() => {
        if (threadId) {
            if (currentThreadId && currentThreadId !== threadId) {
                clearMessages();
            }
            setThread(threadId);
        } else if (currentThreadId) {
            clearMessages();
            setThread('');
        }
    }, [threadId, currentThreadId, setThread, clearMessages]);

    // Load messages from server when thread changes
    useEffect(() => {
        if (threadMessagesQuery.data && threadId) {
            // For now, assuming the data is already in the correct format
            // This would need to be adapted based on your actual server response structure
            const formattedMessages = Array.isArray(threadMessagesQuery.data) ? threadMessagesQuery.data : [];
            loadMessages(formattedMessages, threadId);
        }
    }, [threadMessagesQuery.data, threadId, loadMessages]);

    const handleSendMessage = useCallback(
        async (content: string): Promise<string | undefined> => {
            try {
                // Send message through XState machine
                sendMessage(content, currentThreadId);
                return currentThreadId;
            } catch (error) {
                console.error('Failed to send message:', error);
                return undefined;
            }
        },
        [sendMessage, currentThreadId]
    );

    const handleRetryStream = useCallback(() => {
        retryStream();
    }, [retryStream]);

    const handleAbortStream = useCallback(() => {
        abortStream();
    }, [abortStream]);

    const handlePauseStream = useCallback(() => {
        pauseStream();
    }, [pauseStream]);

    const handleResumeStream = useCallback(() => {
        resumeStream();
    }, [resumeStream]);

    return {
        // State
        messages,
        currentThreadId,
        loading: isLoading || threadMessagesQuery.isLoading,
        isStreaming,
        isPaused,
        isError: !!error || threadMessagesQuery.isError,
        error: error || threadMessagesQuery.error || undefined,

        // Actions
        handleSendMessage,
        handleRetryStream,
        handleAbortStream,
        handlePauseStream,
        handleResumeStream,

        // Additional streaming controls
        canRetry: !!error,
        canPause: isStreaming,
        canResume: isPaused,
        canAbort: isStreaming || isPaused,
    };
};
