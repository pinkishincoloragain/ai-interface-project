import { useEffect } from 'react';
import { useChatStore } from '../model/store';
import { useSendMessageMutation } from '../api';
import { useThreadMessagesQuery, useThreadsQuery } from '@/features/thread';

export const useChatViewModel = (threadId?: string) => {
    const { messages, currentThreadId, loading, isStreaming, setCurrentThreadId, clearMessages, abortCurrentStream } =
        useChatStore();

    const sendMessageMutation = useSendMessageMutation();
    const threadMessagesQuery = useThreadMessagesQuery(threadId);
    useThreadsQuery();

    // Update current thread and clear messages when threadId changes
    useEffect(() => {
        if (threadId) {
            setCurrentThreadId(threadId);
        } else {
            clearMessages();
            setCurrentThreadId(undefined);
        }
    }, [threadId, setCurrentThreadId, clearMessages]);

    const handleSendMessage = async (content: string): Promise<string | undefined> => {
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

    const handleStopStream = () => {
        abortCurrentStream();
    };

    return {
        messages,
        currentThreadId,
        loading: loading || sendMessageMutation.isPending || threadMessagesQuery.isLoading,
        isStreaming,
        handleSendMessage,
        handleStopStream,
        isError: sendMessageMutation.isError || threadMessagesQuery.isError,
        error: sendMessageMutation.error || threadMessagesQuery.error,
    };
};
