import { useEffect, useCallback } from 'react';
import { useChatStore } from '../model/store';

/**
 * Hook responsible for synchronizing thread state
 * Following SRP: Only handles thread ID synchronization logic
 */
export const useThreadSync = (threadId?: string) => {
    const currentThreadId = useChatStore((state) => state.currentThreadId);

    // Memoized handlers to prevent infinite loops
    const syncThread = useCallback(() => {
        try {
            const store = useChatStore.getState();

            if (threadId) {
                // Only set if different to prevent unnecessary updates
                if (store.currentThreadId !== threadId) {
                    // Clear messages only when switching between different existing threads
                    if (store.currentThreadId && store.messages.length > 0) {
                        store.clearMessages();
                    }
                    store.setCurrentThreadId(threadId);
                }
            } else {
                // Clear thread ID and messages when switching to null conversation
                if (store.currentThreadId !== undefined) {
                    store.clearMessages();
                    store.setCurrentThreadId(undefined);
                }
            }
        } catch (error) {
            console.error('Error in thread sync:', error);
        }
    }, [threadId]);

    // Sync thread state when threadId changes
    useEffect(() => {
        syncThread();
    }, [syncThread]);

    return {
        currentThreadId,
        isThreadSynced: currentThreadId === threadId,
    };
};
