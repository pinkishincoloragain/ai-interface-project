import { useCallback, useEffect, useState } from 'react';
import { Session, User } from '@/shared/types/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authApiClient } from '@/shared/api/authApi';
import { sessionStorage } from '@/shared/lib/sessionStorage';
import { useChatStore } from '@/features/chat/model/store';
import { useThreadStore } from '@/features/thread/model/store';
import { useLoginState } from './store';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [previousUserId, setPreviousUserId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { isLoggedIn, hasAttemptedAutoLogin, setLoggedIn, setAttemptedAutoLogin, reset } = useLoginState();

    // Clear application state
    const clearApplicationState = useCallback(() => {
        // Clear chat store
        useChatStore.getState().clearMessages();
        useChatStore.getState().setCurrentThreadId(undefined);
        useChatStore.getState().setLoading(false);
        useChatStore.getState().setMessagesInitialized(false);

        // Clear thread store
        useThreadStore.getState().clearThreads();

        // Clear React Query cache
        queryClient.clear();
    }, [queryClient]);

    useEffect(() => {
        // Auto-login check
        if (!hasAttemptedAutoLogin) {
            setAttemptedAutoLogin(true);

            if (isLoggedIn) {
                // Try to restore session from localStorage
                const storedSession = sessionStorage.getSession();

                if (storedSession && sessionStorage.isSessionValid(storedSession)) {
                    // Verify session with server
                    authApiClient
                        .getUser(storedSession.access_token)
                        .then(({ user, error }) => {
                            if (user && !error) {
                                setUser(user);
                                setSession(storedSession);
                                setPreviousUserId(user.id);
                            } else {
                                // Invalid session, clear everything
                                sessionStorage.removeSession();
                                setLoggedIn(false);
                                clearApplicationState();
                            }
                            setLoading(false);
                        })
                        .catch(() => {
                            // Network error or server error, clear session
                            sessionStorage.removeSession();
                            setLoggedIn(false);
                            clearApplicationState();
                            setLoading(false);
                        });
                } else {
                    // No valid session, reset login state
                    setLoggedIn(false);
                    clearApplicationState();
                    setLoading(false);
                }
            } else {
                // User should start logged out
                setLoading(false);
            }
        } else {
            // Already attempted auto-login, but check if we need to restore user state
            if (isLoggedIn && !user) {
                // User is marked as logged in but no user state - restore from session
                const storedSession = sessionStorage.getSession();

                if (storedSession && sessionStorage.isSessionValid(storedSession)) {
                    // Verify session with server
                    authApiClient
                        .getUser(storedSession.access_token)
                        .then(({ user, error }) => {
                            if (user && !error) {
                                setUser(user);
                                setSession(storedSession);
                                setPreviousUserId(user.id);
                            } else {
                                // Invalid session, clear everything
                                sessionStorage.removeSession();
                                setLoggedIn(false);
                                clearApplicationState();
                            }
                            setLoading(false);
                        })
                        .catch(() => {
                            // Network error or server error, clear session
                            sessionStorage.removeSession();
                            setLoggedIn(false);
                            clearApplicationState();
                            setLoading(false);
                        });
                } else {
                    // No valid session, reset login state
                    setLoggedIn(false);
                    clearApplicationState();
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }
    }, [
        hasAttemptedAutoLogin,
        isLoggedIn,
        user,
        setAttemptedAutoLogin,
        setLoggedIn,
        queryClient,
        clearApplicationState,
    ]);

    const signIn = async (email: string, password: string) => {
        const { user, session, error } = await authApiClient.login(email, password);

        if (user && session && !error) {
            setUser(user);
            setSession(session);
            sessionStorage.setSession(session);
            setLoggedIn(true);

            // Check if user changed
            const currentUserId = user.id;
            if (previousUserId && previousUserId !== currentUserId) {
                clearApplicationState();
            }
            setPreviousUserId(currentUserId);

            // Navigate to chat after successful login
            navigate({ to: '/chat' });
        }

        return { data: { user, session }, error: error ? { message: error } : null };
    };

    const signUp = async (email: string, password: string) => {
        const { user, session, error } = await authApiClient.signup(email, password);

        if (user && session && !error) {
            setUser(user);
            setSession(session);
            sessionStorage.setSession(session);
            setLoggedIn(true);
            setPreviousUserId(user.id);

            // Navigate to chat after successful signup
            navigate({ to: '/chat' });
        }

        return { data: { user, session }, error: error ? { message: error } : null };
    };

    const signOut = async () => {
        let apiError = null;

        // Call logout API if we have a session
        if (session?.access_token) {
            const { error } = await authApiClient.logout(session.access_token);
            apiError = error;
        }

        // Clear local state regardless of API result
        setUser(null);
        setSession(null);
        sessionStorage.removeSession();
        reset();
        clearApplicationState();
        setPreviousUserId(null);

        // Navigate to landing page after sign out
        navigate({ to: '/' });

        return { error: apiError ? { message: apiError } : null };
    };

    return {
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
    };
}
