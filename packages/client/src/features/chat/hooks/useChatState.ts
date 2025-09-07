// No React imports needed for this hook
import { useChatStore } from '../model/store';
import { useThreadMessagesQuery, useThreadsQuery } from '@/features/thread';

/**
 * Hook for accessing chat state and computed values
 * Following SRP: Only handles state selection and derived state
 */
export const useChatState = (threadId?: string) => {
    // Store selectors - simplified to avoid complex equality checks
    const messages = useChatStore((state) => state.messages);
    const currentThreadId = useChatStore((state) => state.currentThreadId);
    const loading = useChatStore((state) => state.loading);
    const messagesInitialized = useChatStore((state) => state.messagesInitialized);

    // Queries
    const threadMessagesQuery = useThreadMessagesQuery(threadId);
    useThreadsQuery();

    // Computed state - simplified to avoid memoization complexity
    const isLoading = loading || threadMessagesQuery.isLoading;
    const { isError } = threadMessagesQuery;
    const { error } = threadMessagesQuery;

    return {
        messages,
        currentThreadId,
        messagesInitialized,
        isLoading,
        isError,
        error,
    };
};
