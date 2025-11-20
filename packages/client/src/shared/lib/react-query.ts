import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { authErrorHandler } from './authErrorHandler';

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error) => {
            // Global error handler for all queries
            authErrorHandler.checkAndHandle(error);
        },
    }),
    mutationCache: new MutationCache({
        onError: (error) => {
            // Global error handler for all mutations
            authErrorHandler.checkAndHandle(error);
        },
    }),
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            retry: (failureCount, error: any) => {
                // Don't retry auth errors - they need to trigger logout
                if (authErrorHandler.isAuthError(error)) return false;
                if (error?.status === 404) return false;
                return failureCount < 3;
            },
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: false,
        },
    },
});

export const QUERY_KEYS = {
    threads: {
        all: ['threads'] as const,
        list: () => [...QUERY_KEYS.threads.all, 'list'] as const,
        detail: (id: string) => [...QUERY_KEYS.threads.all, 'detail', id] as const,
        messages: (id: string) => [...QUERY_KEYS.threads.all, 'messages', id] as const,
    },
    chat: {
        all: ['chat'] as const,
        messages: (threadId?: string) => [...QUERY_KEYS.chat.all, 'messages', threadId] as const,
    },
} as const;
