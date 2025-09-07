import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { useChatStore } from '@/features/chat/model/store';
import { useThreadStore } from '@/features/thread/model/store';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [previousUserId, setPreviousUserId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setPreviousUserId(session?.user?.id ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUserId = session?.user?.id ?? null;

            // Clear all application state when user signs out or changes
            if (event === 'SIGNED_OUT' || (previousUserId && currentUserId && previousUserId !== currentUserId)) {
                // Clear chat store
                useChatStore.getState().clearMessages();
                useChatStore.getState().setCurrentThreadId(undefined);
                useChatStore.getState().setLoading(false);
                useChatStore.getState().setMessagesInitialized(false);

                // Clear thread store
                useThreadStore.getState().clearThreads();

                // Clear React Query cache
                queryClient.clear();
            }

            // Update previous user ID
            setPreviousUserId(currentUserId);

            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [previousUserId, queryClient]);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    };

    const signUp = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        return { data, error };
    };

    const signOut = async () => {
        // State clearing is now handled by the auth state change listener
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    return {
        user,
        loading,
        signIn,
        signUp,
        signOut,
    };
}
