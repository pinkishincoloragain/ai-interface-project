import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ChatContainer } from '@/features/chat';
import { ThreadSidebarContainer, useThreadStore } from '@/features/thread';
import { LoginForm, useAuth } from '@/features/auth';
import type { Thread } from '@/entities/thread';
import { Menu, Edit } from 'lucide-react';

function App() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const params = useParams({ strict: false });
    const { chatId } = params as { chatId?: string };

    const [activeThreadId, setActiveThreadId] = useState<string | undefined>(chatId);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const threads = useThreadStore((state: { threads: Thread[] }) => state.threads);

    // Detect mobile and handle sidebar state
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const mobile = width < 768; // Mobile breakpoint (md in Tailwind)
            setIsMobile(mobile);

            if (mobile) {
                // On mobile, sidebar is hidden by default
                setIsMobileSidebarOpen(false);
                setIsSidebarCollapsed(false); // Always show full width when opened on mobile
            } else {
                // On desktop, auto-collapse on smaller screens
                if (width < 1024) {
                    setIsSidebarCollapsed(true);
                } else {
                    setIsSidebarCollapsed(false);
                }
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
        if (isMobile) {
            setIsMobileSidebarOpen(!isMobileSidebarOpen);
        } else {
            setIsSidebarCollapsed(!isSidebarCollapsed);
        }
    }, [isMobile, isMobileSidebarOpen, isSidebarCollapsed]);

    const handleNewChat = useCallback(() => {
        setActiveThreadId(undefined);
        navigate({ to: '/chat' });
        // Close mobile sidebar when creating new chat
        if (isMobile) {
            setIsMobileSidebarOpen(false);
        }
    }, [navigate, isMobile]);

    const handleMobileThreadSelect = useCallback(
        (threadId: string | undefined) => {
            handleThreadSelect(threadId);
            // Close mobile sidebar after selecting a thread
            if (isMobile) {
                setIsMobileSidebarOpen(false);
            }
        },
        [handleThreadSelect, isMobile]
    );

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
            {/* Mobile overlay backdrop */}
            {isMobile && isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`
                    ${
                        isMobile
                            ? `fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ${
                                  isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                              }`
                            : `${isSidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 transition-all duration-300`
                    }
                `}
            >
                <ThreadSidebarContainer
                    activeThreadId={activeThreadId}
                    onThreadSelect={handleMobileThreadSelect}
                    isCollapsed={!isMobile && isSidebarCollapsed}
                    onToggleCollapse={!isMobile ? handleToggleSidebar : undefined}
                    className="h-full"
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header with Menu Button */}
                <div className="px-4 md:px-6 py-4 flex-shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Button */}
                        {isMobile && (
                            <button
                                onClick={handleToggleSidebar}
                                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors md:hidden"
                                title="Open menu"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <h1 className="text-xl font-semibold text-gray-100">
                            {activeThreadId
                                ? threads.find((t: Thread) => t.id === activeThreadId)?.title || 'Chat'
                                : 'New Chat'}
                        </h1>
                    </div>

                    {/* Mobile New Chat Button (floating on right) */}
                    {isMobile && (
                        <button
                            onClick={handleNewChat}
                            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors md:hidden"
                            title="New chat"
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="flex-1 p-4 md:p-6 min-h-0">
                    <ChatContainer threadId={activeThreadId} onThreadCreated={handleThreadCreated} />
                </div>
            </div>
        </div>
    );
}

export default App;
