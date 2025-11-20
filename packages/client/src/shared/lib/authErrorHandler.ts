/**
 * Global authentication error handler
 * Provides a centralized way to handle auth errors and trigger logout
 */

type LogoutHandler = () => void;

class AuthErrorHandler {
    private logoutHandler: LogoutHandler | null = null;

    /**
     * Register a logout handler (called from useAuth hook)
     */
    setLogoutHandler(handler: LogoutHandler) {
        this.logoutHandler = handler;
    }

    /**
     * Check if an error is an authentication error
     */
    isAuthError(error: unknown): boolean {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return (
                message.includes('not authenticated') ||
                message.includes('unauthorized') ||
                message.includes('401') ||
                message.includes('403')
            );
        }

        if (typeof error === 'object' && error !== null) {
            const { status } = error as any;
            return status === 401 || status === 403;
        }

        return false;
    }

    /**
     * Handle authentication error by triggering logout
     */
    handleAuthError() {
        if (this.logoutHandler) {
            console.warn('[AuthErrorHandler] Authentication error detected, logging out...');
            this.logoutHandler();
        } else {
            console.error('[AuthErrorHandler] No logout handler registered!');
        }
    }

    /**
     * Check and handle auth error in one call
     */
    checkAndHandle(error: unknown): boolean {
        if (this.isAuthError(error)) {
            this.handleAuthError();
            return true;
        }
        return false;
    }
}

export const authErrorHandler = new AuthErrorHandler();
