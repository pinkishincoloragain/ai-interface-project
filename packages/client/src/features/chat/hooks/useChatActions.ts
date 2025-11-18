import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService, type SendMessageParams } from '../services';
import { QUERY_KEYS } from '@/shared/lib/react-query';
import { useThreadStore, useChatStore } from '@/features';

/**
 * Hook for chat actions - sending messages, managing state
 * Following SRP: Only handles UI-related chat actions
 */
export const useChatActions = () => {
    const queryClient = useQueryClient();
    const addThread = useThreadStore((state) => state.addThread);

    const sendMessageMutation = useMutation({
        mutationFn: (params: SendMessageParams) => chatService.sendMessage(params),
        onError: (error) => {
            console.error('Failed to send message:', error);
        },
    });

    const sendMessage = useCallback(
        async (content: string, threadId?: string): Promise<string | undefined> => {
            try {
                const wasNewThread = !threadId;
                const resultThreadId = await sendMessageMutation.mutateAsync({ content, threadId });

                // If a new thread was created, add it optimistically to the store and refetch
                if (wasNewThread && resultThreadId) {
                    // Get the first user message to use as title
                    const { messages } = useChatStore.getState();
                    const firstUserMessage = messages.find((m) => m.role === 'user');
                    const title = firstUserMessage
                        ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
                        : 'New Chat';

                    // Optimistically add the thread to the store
                    addThread({
                        id: resultThreadId,
                        title,
                        messages,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });

                    // Then refetch to get the actual server state
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.threads.list() });
                }

                return resultThreadId;
            } catch (error) {
                console.error('Failed to send message:', error);
                return undefined;
            }
        },
        [sendMessageMutation, queryClient, addThread]
    );

    const stopStreaming = useCallback(() => {
        chatService.stopStreaming();
    }, []);

    return {
        sendMessage,
        stopStreaming,
        isPending: sendMessageMutation.isPending,
        isError: sendMessageMutation.isError,
        error: sendMessageMutation.error,
    };
};
