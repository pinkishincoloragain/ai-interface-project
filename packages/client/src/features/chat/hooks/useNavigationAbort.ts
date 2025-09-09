import { useEffect } from 'react';
import { chatService } from '../services/ChatService';

/**
 * Hook to ensure proper cleanup of streaming when component unmounts
 * or when navigation occurs in React applications
 */
export function useNavigationAbort() {
    useEffect(() => {
        // Add an additional listener for React Router navigation
        // This handles route changes within the SPA
        const handleRouteChange = () => {
            if (chatService.isStreaming()) {
                chatService.cleanup();
            }
        };

        // Listen for hashchange (for hash-based routing)
        if (typeof window !== 'undefined') {
            window.addEventListener('hashchange', handleRouteChange);
        }

        // Cleanup function that runs when component unmounts
        return () => {
            if (chatService.isStreaming()) {
                chatService.cleanup();
            }

            // Remove event listener
            if (typeof window !== 'undefined') {
                window.removeEventListener('hashchange', handleRouteChange);
            }
        };
    }, []);

    // Return cleanup function for manual use if needed
    return {
        cleanup: () => chatService.cleanup(),
        isStreaming: () => chatService.isStreaming(),
    };
}
