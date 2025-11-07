import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ThreadItemData } from '../ThreadItem';

interface ThreadListCollapsedProps {
    threads: ThreadItemData[];
    activeThreadId?: string;
    onThreadSelect?: (thread: ThreadItemData) => void;
    onNewThread?: () => void;
}

export const ThreadListCollapsed: React.FC<ThreadListCollapsedProps> = ({
    threads,
    activeThreadId,
    onThreadSelect,
    onNewThread,
}) => (
    <div className="flex flex-col h-full">
        {/* New Chat Button */}
        {onNewThread && (
            <div className="p-2">
                <button
                    onClick={onNewThread}
                    className="w-full p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                    title="New Chat"
                >
                    <MessageSquare className="w-5 h-5 mx-auto" />
                </button>
            </div>
        )}

        {/* Collapsed Thread List */}
        <div className="p-2 space-y-1 flex-1">
            {threads.slice(0, 10).map((thread) => (
                <button
                    key={thread.id}
                    onClick={() => onThreadSelect?.(thread)}
                    className={`w-full p-2 rounded-lg transition-colors ${
                        thread.id === activeThreadId
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                    title={thread.title}
                >
                    <MessageSquare className="w-4 h-4 mx-auto" />
                </button>
            ))}
        </div>
    </div>
);
