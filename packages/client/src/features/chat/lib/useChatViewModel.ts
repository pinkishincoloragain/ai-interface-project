import { useEffect } from 'react';
import { useChatStore } from '@/features';
import { useSendMessageMutation } from '../api';
import { useThreadMessagesQuery, useThreadsQuery } from '@/features/thread';

export const useChatViewModel = (threadId?: string, onThreadCreated?: (threadId: string) => void) => {
    const { messages, currentThreadId, loading, setCurrentThreadId, clearMessages } = useChatStore();

    const { sendMessageMutation, getAbortController } = useSendMessageMutation({ onThreadCreated });
    const threadMessagesQuery = useThreadMessagesQuery(threadId);
    useThreadsQuery();

    // Update current thread when threadId changes, but only clear messages when switching between different threads
    useEffect(() => {
        if (threadId) {
            // Only clear messages if we're switching to a different thread
            if (currentThreadId && currentThreadId !== threadId) {
                clearMessages();
            }
            setCurrentThreadId(threadId);
        } else if (currentThreadId) {
            // Only clear messages when explicitly switching away from a thread
            clearMessages();
            setCurrentThreadId(undefined);
        }
    }, [threadId, currentThreadId, setCurrentThreadId, clearMessages]);

    const handleSendMessage = async (content: string): Promise<string | undefined> => {
        if (loading) return;

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
    };

    const handleAbortStream = () => {
        const abortController = getAbortController();
        if (abortController && loading) {
            abortController.abort('사용자가 스트림을 중단했습니다');
        }
    };

    return {
        messages,
        currentThreadId,
        loading: loading || sendMessageMutation.isPending || threadMessagesQuery.isLoading,
        handleSendMessage,
        handleAbortStream,
        isError: sendMessageMutation.isError || threadMessagesQuery.isError,
        error: sendMessageMutation.error || threadMessagesQuery.error,
    };
};
