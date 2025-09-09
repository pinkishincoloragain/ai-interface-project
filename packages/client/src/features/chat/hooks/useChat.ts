import { useCallback } from 'react';
import { useChatState } from './useChatState';
import { useChatActions } from './useChatActions';
import { useThreadSync } from './useThreadSync';

/**
 * Main chat hook that combines state, actions, and thread synchronization
 * Following SRP: Coordinates between different chat concerns
 */
export const useChat = (threadId?: string) => {
    // Use individual hooks for different concerns
    const chatState = useChatState(threadId);
    const chatActions = useChatActions();
    const threadSync = useThreadSync(threadId);

    // Compose the final handler that includes thread synchronization
    const handleSendMessage = useCallback(
        async (content: string): Promise<string | undefined> =>
            await chatActions.sendMessage(content, threadSync.currentThreadId),
        [chatActions.sendMessage, threadSync.currentThreadId]
    );

    return {
        // State
        messages: chatState.messages,
        currentThreadId: chatState.currentThreadId,
        loading: chatState.isLoading,
        isError: chatState.isError || chatActions.isError,
        error: chatState.error || chatActions.error,

        // Actions
        handleSendMessage,
        stopStreaming: chatActions.stopStreaming,

        // Thread sync info
        isThreadSynced: threadSync.isThreadSynced,
    };
};
