import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { useChatStore } from '@/features/chat/model/store';
import { useThreadStore } from '@/features/thread/model/store';
import { useLoginState } from './store';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [previousUserId, setPreviousUserId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const { isLoggedIn, hasAttemptedAutoLogin, setLoggedIn, setAttemptedAutoLogin, reset } = useLoginState();

    useEffect(() => {
        // Only auto-login if user hasn't attempted auto-login and is marked as logged in
        if (!hasAttemptedAutoLogin) {
            setAttemptedAutoLogin(true);
            if (isLoggedIn) {
                // Get initial session only if user should be logged in
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session?.user) {
                        setUser(session.user);
                        setPreviousUserId(session.user.id);
                    } else {
                        // No valid session, reset login state
                        setLoggedIn(false);
                    }
                    setLoading(false);
                });
            } else {
                // User should start logged out
                setLoading(false);
            }
        } else {
            // Already attempted auto-login
            setLoading(false);
        }

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

                // Reset login state on sign out
                if (event === 'SIGNED_OUT') {
                    reset();
                }
            }

            // Update previous user ID
            setPreviousUserId(currentUserId);

            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [previousUserId, queryClient, hasAttemptedAutoLogin, isLoggedIn, setAttemptedAutoLogin, setLoggedIn, reset]);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (data.user && !error) {
            setLoggedIn(true);
        }

        return { data, error };
    };

    const signUp = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (data.user && !error) {
            setLoggedIn(true);
        }

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
