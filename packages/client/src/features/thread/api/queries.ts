import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/lib/react-query';
import { threadApiClient } from './client';
import { useChatStore, useThreadStore } from '@/features';

export const useThreadsQuery = () => {
    const setThreads = useThreadStore((state) => state.setThreads);

    const query = useQuery({
        queryKey: QUERY_KEYS.threads.list(),
        queryFn: threadApiClient.getThreads.bind(threadApiClient),
    });

    // Update store when data changes
    React.useEffect(() => {
        if (query.data) {
            setThreads(query.data.threads);
        }
    }, [query.data, setThreads]);

    return query;
};

export const useThreadQuery = (threadId: string) =>
    useQuery({
        queryKey: QUERY_KEYS.threads.detail(threadId),
        queryFn: () => threadApiClient.getThread(threadId),
        enabled: !!threadId,
    });

export const useThreadMessagesQuery = (threadId?: string) => {
    const setMessages = useChatStore((state) => state.setMessages);
    const loading = useChatStore((state) => state.loading);
    const messagesInitialized = useChatStore((state) => state.messagesInitialized);
    const currentThreadId = useChatStore((state) => state.currentThreadId);

    // Use threadId parameter or fall back to currentThreadId from store
    const effectiveThreadId = threadId || currentThreadId;

    const query = useQuery({
        queryKey: QUERY_KEYS.threads.messages(effectiveThreadId || ''),
        queryFn: () => threadApiClient.getThreadMessages(effectiveThreadId!),
        enabled: !!effectiveThreadId && !loading, // Don't fetch during active streaming
    });

    // Update store when data changes, but preserve local messages during active sessions
    React.useEffect(() => {
        if (query.data && effectiveThreadId && !loading) {
            const serverMessages = query.data.thread.messages || [];
            const currentMessages = useChatStore.getState().messages;

            // Only update from server if:
            // 1. Messages haven't been initialized for this thread, OR
            // 2. We have no local messages but server has messages (thread switch case)
            if (!messagesInitialized || (currentMessages.length === 0 && serverMessages.length > 0)) {
                setMessages(serverMessages);
            }
        }
    }, [query.data, effectiveThreadId, setMessages, loading, messagesInitialized]);

    return query;
};

export const useCreateThreadMutation = () => {
    const queryClient = useQueryClient();
    const addThread = useThreadStore((state) => state.addThread);

    return useMutation({
        mutationFn: threadApiClient.createThread.bind(threadApiClient),
        onSuccess: (data: { thread: import('@/entities/thread/model/types').Thread }) => {
            addThread(data.thread);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.threads.list() });
        },
    });
};

export const useUpdateThreadMutation = () => {
    const queryClient = useQueryClient();
    const updateThread = useThreadStore((state) => state.updateThread);

    return useMutation({
        mutationFn: ({ threadId, data }: { threadId: string; data: { title: string } }) =>
            threadApiClient.updateThread(threadId, data),
        onSuccess: (data, variables) => {
            updateThread(variables.threadId, data.thread);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.threads.list() });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.threads.detail(variables.threadId) });
        },
    });
};

export const useDeleteThreadMutation = () => {
    const queryClient = useQueryClient();
    const removeThread = useThreadStore((state) => state.removeThread);

    return useMutation({
        mutationFn: (threadId: string) => threadApiClient.deleteThread(threadId),
        onSuccess: (_, threadId: string) => {
            removeThread(threadId);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.threads.list() });
        },
    });
};
