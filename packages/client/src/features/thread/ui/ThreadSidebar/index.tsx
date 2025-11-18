import React from 'react';
import { Sidebar } from '@/shared/ui/Sidebar';
import { ThreadList } from '../ThreadList';
import { ThreadListCollapsed, ThreadSidebarFooter, ThreadSidebarHeader } from '@/features/thread/ui';
import type { ThreadItemData } from '../ThreadItem';

export interface ThreadWithMessages {
    id: string;
    title: string;
    messages: { id: string; content: string; role: string }[];
    createdAt: string;
    updatedAt: string;
}

// Keep backward compatibility
export type Thread = ThreadWithMessages;

interface ThreadSidebarProps {
    threads: Thread[];
    activeThreadId?: string;
    onThreadSelect?: (thread: Thread) => void;
    onNewThread?: () => void;
    onDeleteThread?: (threadId: string) => void;
    onEditThread?: (threadId: string, newTitle: string) => void;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
    onOpenSearch?: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    className?: string;
}

export const ThreadSidebar: React.FC<ThreadSidebarProps> = ({
    threads,
    activeThreadId,
    onThreadSelect,
    onNewThread,
    onDeleteThread,
    onEditThread,
    searchQuery = '',
    onOpenSearch,
    isCollapsed = false,
    onToggleCollapse,
    className = '',
}) => {
    // Transform threads to ThreadItemData format
    const threadItems: ThreadItemData[] = threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        messages: thread.messages,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
    }));

    const handleThreadSelect = (thread: ThreadItemData) => {
        onThreadSelect?.(thread);
    };

    return (
        <Sidebar
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            className={className}
            header={
                <ThreadSidebarHeader isCollapsed={isCollapsed} onNewThread={onNewThread} onOpenSearch={onOpenSearch} />
            }
            footer={<ThreadSidebarFooter isCollapsed={isCollapsed} />}
        >
            {isCollapsed ? (
                <ThreadListCollapsed
                    threads={threadItems}
                    activeThreadId={activeThreadId}
                    onThreadSelect={handleThreadSelect}
                    onNewThread={onNewThread}
                />
            ) : (
                <ThreadList
                    threads={threadItems}
                    activeThreadId={activeThreadId}
                    onThreadSelect={handleThreadSelect}
                    onEditThread={onEditThread}
                    onDeleteThread={onDeleteThread}
                    onNewThread={onNewThread}
                    searchQuery={searchQuery}
                />
            )}
        </Sidebar>
    );
};
