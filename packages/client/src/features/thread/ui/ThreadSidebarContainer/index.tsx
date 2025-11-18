import React, { useState } from 'react';
import { ThreadWithMessages, ThreadSidebar, useThreadViewModel, SearchModal } from '@/features/thread';

interface ThreadSidebarContainerProps {
    onThreadSelect?: (threadId: string) => void;
    activeThreadId?: string;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    className?: string;
}

export const ThreadSidebarContainer: React.FC<ThreadSidebarContainerProps> = ({
    onThreadSelect,
    activeThreadId,
    isCollapsed = false,
    onToggleCollapse,
    className = '',
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    const { threads, error, updateThread, deleteThread, selectThread } = useThreadViewModel();

    const handleThreadSelect = (threadId: string) => {
        selectThread(threadId);
        onThreadSelect?.(threadId);
    };

    const handleNewThread = () => {
        // If already showing null conversation, do nothing
        if (!activeThreadId) {
            return;
        }

        // Clear active thread selection to show empty chat
        // New thread will be created when user sends first message
        selectThread(undefined);
        onThreadSelect?.(undefined as any);
    };

    const handleDeleteThread = async (threadId: string) => {
        await deleteThread(threadId);
    };

    const handleEditThread = async (threadId: string, title: string) => {
        await updateThread(threadId, title);
    };

    // Transform threads to match the expected interface
    const transformedThreads: ThreadWithMessages[] = threads.map((thread) => ({
        ...thread,
        messages: thread.messages || [], // Use actual messages from the thread
    }));

    if (error) {
        console.error('Thread sidebar error:', error);
    }

    return (
        <>
            <ThreadSidebar
                threads={transformedThreads}
                activeThreadId={activeThreadId}
                onThreadSelect={(thread) => handleThreadSelect(thread.id)}
                onNewThread={handleNewThread}
                onDeleteThread={handleDeleteThread}
                onEditThread={handleEditThread}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onOpenSearch={() => setIsSearchModalOpen(true)}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
                className={className}
            />
            <SearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                threads={transformedThreads}
                onThreadSelect={(thread) => handleThreadSelect(thread.id)}
            />
        </>
    );
};
