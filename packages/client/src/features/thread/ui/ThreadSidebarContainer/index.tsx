import React, { useState } from 'react';
import { ThreadWithMessages, ThreadSidebar, useThreadViewModel } from '@/features/thread';

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

    const { threads, error, createThread, updateThread, deleteThread, selectThread } = useThreadViewModel();

    const handleThreadSelect = (threadId: string) => {
        selectThread(threadId);
        onThreadSelect?.(threadId);
    };

    const handleNewThread = async () => {
        const newThread = await createThread();
        if (newThread) {
            handleThreadSelect(newThread.id);
        }
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
        <ThreadSidebar
            threads={transformedThreads}
            activeThreadId={activeThreadId}
            onThreadSelect={(thread) => handleThreadSelect(thread.id)}
            onNewThread={handleNewThread}
            onDeleteThread={handleDeleteThread}
            onEditThread={handleEditThread}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            className={className}
        />
    );
};
