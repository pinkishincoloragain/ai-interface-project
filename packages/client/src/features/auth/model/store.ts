import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Session } from '@/shared/types/auth';

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoggedIn: boolean;
    hasAttemptedAutoLogin: boolean;
    loading: boolean;
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    setLoggedIn: (loggedIn: boolean) => void;
    setAttemptedAutoLogin: (attempted: boolean) => void;
    setLoading: (loading: boolean) => void;
    reset: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            session: null,
            isLoggedIn: false,
            hasAttemptedAutoLogin: false,
            loading: true,
            setUser: (user: User | null) => set({ user }),
            setSession: (session: Session | null) => set({ session }),
            setLoggedIn: (loggedIn: boolean) => set({ isLoggedIn: loggedIn }),
            setAttemptedAutoLogin: (attempted: boolean) => set({ hasAttemptedAutoLogin: attempted }),
            setLoading: (loading: boolean) => set({ loading }),
            reset: () =>
                set({ user: null, session: null, isLoggedIn: false, hasAttemptedAutoLogin: false, loading: false }),
        }),
        {
            name: 'auth-state',
            partialize: (state) => ({
                isLoggedIn: state.isLoggedIn,
                hasAttemptedAutoLogin: state.hasAttemptedAutoLogin,
            }),
        }
    )
);

// Keep the old export for backward compatibility during migration
export const useLoginState = useAuthStore;
