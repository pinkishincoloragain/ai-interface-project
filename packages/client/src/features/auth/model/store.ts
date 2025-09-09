import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LoginState {
    isLoggedIn: boolean;
    hasAttemptedAutoLogin: boolean;
    setLoggedIn: (loggedIn: boolean) => void;
    setAttemptedAutoLogin: (attempted: boolean) => void;
    reset: () => void;
}

export const useLoginState = create<LoginState>()(
    persist(
        (set) => ({
            isLoggedIn: false,
            hasAttemptedAutoLogin: false,
            setLoggedIn: (loggedIn: boolean) => set({ isLoggedIn: loggedIn }),
            setAttemptedAutoLogin: (attempted: boolean) => set({ hasAttemptedAutoLogin: attempted }),
            reset: () => set({ isLoggedIn: false, hasAttemptedAutoLogin: false }),
        }),
        {
            name: 'login-state',
            partialize: (state) => ({
                isLoggedIn: state.isLoggedIn,
                hasAttemptedAutoLogin: state.hasAttemptedAutoLogin,
            }),
        }
    )
);
