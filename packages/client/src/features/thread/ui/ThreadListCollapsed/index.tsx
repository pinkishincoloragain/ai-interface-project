import React from 'react';
import { ThreadItemData } from '../ThreadItem';

interface ThreadListCollapsedProps {
    threads: ThreadItemData[];
    activeThreadId?: string;
    onThreadSelect?: (thread: ThreadItemData) => void;
    onNewThread?: () => void;
}

export const ThreadListCollapsed: React.FC<ThreadListCollapsedProps> = () => (
    <div className="flex flex-col h-full">{/* When collapsed, don't show chat histories */}</div>
);
