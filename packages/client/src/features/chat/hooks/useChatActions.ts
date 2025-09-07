import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatService, type SendMessageParams } from '../services';

/**
 * Hook for chat actions - sending messages, managing state
 * Following SRP: Only handles UI-related chat actions
 */
export const useChatActions = () => {
    const sendMessageMutation = useMutation({
        mutationFn: (params: SendMessageParams) => chatService.sendMessage(params),
        onError: (error) => {
            console.error('Failed to send message:', error);
        },
    });

    const sendMessage = useCallback(
        async (content: string, threadId?: string): Promise<string | undefined> => {
            try {
                return await sendMessageMutation.mutateAsync({ content, threadId });
            } catch (error) {
                console.error('Failed to send message:', error);
                return undefined;
            }
        },
        [sendMessageMutation]
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
