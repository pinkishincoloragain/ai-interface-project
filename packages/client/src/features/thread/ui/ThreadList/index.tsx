import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ThreadItem, ThreadItemData } from '../ThreadItem';
import { EmptyState } from '@/shared/ui';

interface ThreadListProps {
    threads: ThreadItemData[];
    activeThreadId?: string;
    onThreadSelect?: (thread: ThreadItemData) => void;
    onEditThread?: (threadId: string, newTitle: string) => void;
    onDeleteThread?: (threadId: string) => void;
    onNewThread?: () => void;
    searchQuery?: string;
}

export const ThreadList: React.FC<ThreadListProps> = ({
    threads,
    activeThreadId,
    onThreadSelect,
    onEditThread,
    onDeleteThread,
    onNewThread,
    searchQuery = '',
}) => {
    const filteredThreads = threads.filter((thread) => thread.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filteredThreads.length === 0) {
        return (
            <div className="p-2">
                <EmptyState
                    icon={<MessageSquare className="w-12 h-12 text-gray-500" />}
                    message={searchQuery ? 'No conversations found' : 'No conversations yet'}
                    actionLabel={!searchQuery ? 'Start your first chat' : undefined}
                    onAction={!searchQuery ? onNewThread : undefined}
                />
            </div>
        );
    }

    return (
        <div className="p-2">
            <div className="space-y-1">
                {filteredThreads.map((thread) => (
                    <ThreadItem
                        key={thread.id}
                        thread={thread}
                        isActive={thread.id === activeThreadId}
                        onSelect={onThreadSelect}
                        onEdit={onEditThread}
                        onDelete={onDeleteThread}
                    />
                ))}
            </div>
        </div>
    );
};
