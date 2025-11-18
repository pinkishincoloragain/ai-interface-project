import { Session } from '@/shared/types/auth';

const SESSION_KEY = 'seamlessai-session';

export const sessionStorage = {
    getSession(): Session | null {
        try {
            const sessionData = localStorage.getItem(SESSION_KEY);
            if (!sessionData) return null;

            const session = JSON.parse(sessionData);

            // Check if session is expired
            if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
                this.removeSession();
                return null;
            }

            return session;
        } catch {
            return null;
        }
    },

    setSession(session: Session): void {
        try {
            // Calculate expires_at if not present
            const sessionWithExpiry = {
                ...session,
                expires_at: session.expires_at || Math.floor(Date.now() / 1000) + session.expires_in,
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionWithExpiry));
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    },

    removeSession(): void {
        try {
            localStorage.removeItem(SESSION_KEY);
        } catch (error) {
            console.error('Failed to remove session:', error);
        }
    },

    isSessionValid(session: Session | null): boolean {
        if (!session) return false;

        // Check if access token exists
        if (!session.access_token) return false;

        // Check expiration
        if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
            return false;
        }

        return true;
    },
};
