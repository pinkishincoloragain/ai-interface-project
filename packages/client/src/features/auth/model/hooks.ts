import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authApiClient } from '@/shared/api/authApi';
import { sessionStorage } from '@/shared/lib/sessionStorage';
import { authErrorHandler } from '@/shared/lib/authErrorHandler';
import { useChatStore } from '@/features/chat/model/store';
import { useThreadStore } from '@/features/thread/model/store';
import { useAuthStore } from './store';
import type { Session, User } from '@/shared/types/auth';

export function useAuth() {
    const [previousUserId, setPreviousUserId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const {
        user,
        session,
        loading,
        isLoggedIn,
        hasAttemptedAutoLogin,
        setUser,
        setSession,
        setLoading,
        setLoggedIn,
        setAttemptedAutoLogin,
        reset,
    } = useAuthStore();

    // Clear all application data
    const clearApplicationState = useCallback(() => {
        useChatStore.getState().clearMessages();
        useChatStore.getState().setCurrentThreadId(undefined);
        useChatStore.getState().setLoading(false);
        useChatStore.getState().setMessagesInitialized(false);
        useThreadStore.getState().clearThreads();
        queryClient.clear();
    }, [queryClient]);

    // Invalidate and clear session
    const invalidateSession = useCallback(() => {
        sessionStorage.removeSession();
        setLoggedIn(false);
        clearApplicationState();
    }, [setLoggedIn, clearApplicationState]);

    // Restore and verify session from storage
    const restoreSession = useCallback(
        async (storedSession: Session): Promise<User | null> => {
            try {
                const { user, error } = await authApiClient.getUser(storedSession.access_token);

                if (user && !error) {
                    setUser(user);
                    setSession(storedSession);
                    setPreviousUserId(user.id);
                    return user;
                }

                invalidateSession();
                return null;
            } catch {
                invalidateSession();
                return null;
            }
        },
        [setUser, setSession, invalidateSession]
    );

    // Handle initial auto-login attempt
    useEffect(() => {
        if (hasAttemptedAutoLogin) return;

        (async () => {
            setAttemptedAutoLogin(true);

            // User should start logged out - nothing to restore
            if (!isLoggedIn) {
                setLoading(false);
                return;
            }

            // Check for stored session
            const storedSession = sessionStorage.getSession();
            const hasValidStoredSession = storedSession && sessionStorage.isSessionValid(storedSession);

            if (hasValidStoredSession) {
                await restoreSession(storedSession);
            } else {
                invalidateSession();
            }

            setLoading(false);
        })();
    }, [hasAttemptedAutoLogin, isLoggedIn, setAttemptedAutoLogin, setLoading, restoreSession, invalidateSession]);

    // Restore user state if logged in but missing user data
    useEffect(() => {
        if (!hasAttemptedAutoLogin) return;
        if (!isLoggedIn || user) return;

        (async () => {
            const storedSession = sessionStorage.getSession();
            const hasValidStoredSession = storedSession && sessionStorage.isSessionValid(storedSession);

            if (hasValidStoredSession) {
                await restoreSession(storedSession);
            } else {
                invalidateSession();
            }

            setLoading(false);
        })();
    }, [hasAttemptedAutoLogin, isLoggedIn, user, setLoading, restoreSession, invalidateSession]);

    // Persist authenticated session and update state
    const persistAuthenticatedSession = useCallback(
        (user: User, session: Session) => {
            // Check if user changed and clear state if needed
            const userChanged = previousUserId && previousUserId !== user.id;
            if (userChanged) {
                clearApplicationState();
            }

            setUser(user);
            setSession(session);
            sessionStorage.setSession(session);
            setLoggedIn(true);
            setPreviousUserId(user.id);
        },
        [previousUserId, setUser, setSession, setLoggedIn, clearApplicationState]
    );

    const signIn = useCallback(
        async (email: string, password: string) => {
            const { user, session, error } = await authApiClient.login(email, password);

            if (!user || !session || error) {
                return { data: { user, session }, error: error ? { message: error } : null };
            }

            persistAuthenticatedSession(user, session);
            navigate({ to: '/chat' });

            return { data: { user, session }, error: null };
        },
        [persistAuthenticatedSession, navigate]
    );

    const signUp = useCallback(
        async (email: string, password: string) => {
            const { user, session, error } = await authApiClient.signup(email, password);

            if (!user || !session || error) {
                return { data: { user, session }, error: error ? { message: error } : null };
            }

            persistAuthenticatedSession(user, session);
            navigate({ to: '/chat' });

            return { data: { user, session }, error: null };
        },
        [persistAuthenticatedSession, navigate]
    );

    const signOut = useCallback(async () => {
        // Attempt to logout via API if session exists
        let apiError = null;
        if (session?.access_token) {
            const { error } = await authApiClient.logout(session.access_token);
            apiError = error;
        }

        // Clear all local state regardless of API result
        setUser(null);
        setSession(null);
        sessionStorage.removeSession();
        reset();
        clearApplicationState();
        setPreviousUserId(null);

        navigate({ to: '/' });

        return { error: apiError ? { message: apiError } : null };
    }, [session, setUser, setSession, reset, clearApplicationState, navigate]);

    // Register logout handler with global auth error handler
    useEffect(() => {
        authErrorHandler.setLogoutHandler(() => {
            signOut();
        });
    }, [signOut]);

    return {
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
    };
}
