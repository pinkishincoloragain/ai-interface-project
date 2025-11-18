import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ChatContainer } from '@/features/chat';
import { ThreadSidebarContainer, useThreadStore } from '@/features/thread';
import { LoginForm, useAuth } from '@/features/auth';
import type { Thread } from '@/entities/thread';

function App() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const params = useParams({ strict: false });
    const { chatId } = params as { chatId?: string };

    const [activeThreadId, setActiveThreadId] = useState<string | undefined>(chatId);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const threads = useThreadStore((state: { threads: Thread[] }) => state.threads);

    // Auto-collapse sidebar on smaller screens
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            // Auto-collapse on screens smaller than 1024px (tablets and mobile)
            if (width < 1024) {
                setIsSidebarCollapsed(true);
            } else {
                setIsSidebarCollapsed(false);
            }
        };

        // Check on initial load
        handleResize();

        // Add event listener for window resize
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync activeThreadId with URL parameter
    useEffect(() => {
        setActiveThreadId(chatId);
    }, [chatId]);

    // All hooks must be at the top level
    const handleThreadSelect = useCallback(
        (threadId: string | undefined) => {
            if (threadId) {
                setActiveThreadId(threadId);
                navigate({ to: `/chat/${threadId}` });
            } else {
                setActiveThreadId(undefined);
                navigate({ to: '/chat' });
            }
        },
        [navigate]
    );

    const handleThreadCreated = useCallback(
        (threadId: string) => {
            setActiveThreadId(threadId);
            navigate({ to: `/chat/${threadId}` });
        },
        [navigate]
    );

    const handleToggleSidebar = useCallback(() => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    }, [isSidebarCollapsed]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <div className="text-lg text-gray-100">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return <LoginForm />;
    }

    return (
        <div className="h-screen bg-gray-950 flex overflow-hidden">
            {/* Sidebar */}
            <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 transition-all duration-300`}>
                <ThreadSidebarContainer
                    activeThreadId={activeThreadId}
                    onThreadSelect={handleThreadSelect}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={handleToggleSidebar}
                    className="h-full"
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="px-6 py-4 flex-shrink-0">
                    <h1 className="text-xl font-semibold text-gray-100">
                        {activeThreadId
                            ? threads.find((t: Thread) => t.id === activeThreadId)?.title || 'Chat'
                            : 'New Chat'}
                    </h1>
                </div>
                <div className="flex-1 p-6 min-h-0">
                    <ChatContainer threadId={activeThreadId} onThreadCreated={handleThreadCreated} />
                </div>
            </div>
        </div>
    );
}

export default App;
