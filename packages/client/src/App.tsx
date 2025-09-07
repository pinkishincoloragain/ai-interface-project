import { useState, useCallback } from 'react';
import { ChatContainer } from '@/features/chat';
import { ThreadSidebarContainer, useThreadStore } from '@/features/thread';
import { useAuth, LoginForm } from '@/features/auth';

function App() {
    const { user, loading, signOut } = useAuth();
    const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const threads = useThreadStore((state) => state.threads);

    // All hooks must be at the top level
    const handleThreadSelect = useCallback((threadId: string) => {
        setActiveThreadId(threadId);
    }, []);

    const handleThreadCreated = useCallback((threadId: string) => {
        setActiveThreadId(threadId);
    }, []);

    const handleToggleSidebar = useCallback(() => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    }, [isSidebarCollapsed]);

    const handleSignOut = useCallback(async () => {
        await signOut();
    }, [signOut]);

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
            <div className={`${isSidebarCollapsed ? 'w-16' : 'w-80'} flex-shrink-0 transition-all duration-300`}>
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
                <div className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex-shrink-0 flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-gray-100">
                        {activeThreadId ? threads.find((t) => t.id === activeThreadId)?.title || 'Chat' : 'New Chat'}
                    </h1>
                    <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-200">
                        Sign Out
                    </button>
                </div>
                <div className="flex-1 p-6 min-h-0">
                    <ChatContainer threadId={activeThreadId} onThreadCreated={handleThreadCreated} />
                </div>
            </div>
        </div>
    );
}

export default App;
