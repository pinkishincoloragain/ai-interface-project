import { useEffect, useCallback, useMemo } from 'react';
import { useChatStore } from '@/features';
import { useSendMessageMutation } from '../api';
import { useThreadMessagesQuery, useThreadsQuery } from '@/features/thread';

export const useChatViewModel = (threadId?: string) => {
    // Use specific selectors to prevent unnecessary re-renders
    const messages = useChatStore((state) => state.messages);
    const currentThreadId = useChatStore((state) => state.currentThreadId);
    const loading = useChatStore((state) => state.loading);
    const setCurrentThreadId = useChatStore((state) => state.setCurrentThreadId);
    const clearMessages = useChatStore((state) => state.clearMessages);

    const sendMessageMutation = useSendMessageMutation();
    const threadMessagesQuery = useThreadMessagesQuery(threadId);
    useThreadsQuery();

    // Update current thread when threadId changes, but preserve messages when creating new threads
    useEffect(() => {
        if (threadId) {
            // Only clear messages if we're switching to a completely different existing thread
            // Don't clear when creating a new thread (threadId appears for first time)
            if (currentThreadId && currentThreadId !== threadId) {
                const hasExistingMessages = messages.length > 0;
                // Only clear if we have existing messages and we're switching to a different thread
                if (hasExistingMessages) {
                    clearMessages();
                }
            }
            setCurrentThreadId(threadId);
        } else if (currentThreadId && messages.length === 0) {
            // Only clear thread ID when there are no messages to preserve
            clearMessages();
            setCurrentThreadId(undefined);
        }
    }, [threadId, currentThreadId, setCurrentThreadId, clearMessages, messages.length]);

    const handleSendMessage = useCallback(
        async (content: string): Promise<string | undefined> => {
            try {
                const result = await sendMessageMutation.mutateAsync({
                    content,
                    threadId: currentThreadId,
                });

                return result;
            } catch (error) {
                console.error('Failed to send message:', error);
                return undefined;
            }
        },
        [sendMessageMutation, currentThreadId]
    );

    // Memoize complex loading state calculation
    const isLoading = useMemo(
        () => loading || sendMessageMutation.isPending || threadMessagesQuery.isLoading,
        [loading, sendMessageMutation.isPending, threadMessagesQuery.isLoading]
    );

    // Memoize error state
    const errorState = useMemo(
        () => ({
            isError: sendMessageMutation.isError || threadMessagesQuery.isError,
            error: sendMessageMutation.error || threadMessagesQuery.error,
        }),
        [sendMessageMutation.isError, threadMessagesQuery.isError, sendMessageMutation.error, threadMessagesQuery.error]
    );

    return {
        messages,
        currentThreadId,
        loading: isLoading,
        handleSendMessage,
        ...errorState,
    };
};
