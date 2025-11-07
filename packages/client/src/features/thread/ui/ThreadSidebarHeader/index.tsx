import React from 'react';
import { MessageSquare } from 'lucide-react';
import { SearchInput } from '@/shared/ui';

interface ThreadSidebarHeaderProps {
    isCollapsed?: boolean;
    onNewThread?: () => void;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
}

export const ThreadSidebarHeader: React.FC<ThreadSidebarHeaderProps> = ({
    isCollapsed = false,
    onNewThread,
    searchQuery = '',
    onSearchChange,
}) => {
    if (isCollapsed) {
        return (
            <div className="flex items-center justify-between">
                <MessageSquare className="w-6 h-6 text-gray-300" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-300" />
                    <h2 className="text-lg font-semibold text-gray-100">Chat History</h2>
                </div>
                {onNewThread && (
                    <button
                        onClick={onNewThread}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                        title="New Chat"
                    >
                        New Chat
                    </button>
                )}
            </div>
            <SearchInput
                value={searchQuery}
                onChange={onSearchChange || (() => {})}
                placeholder="Search conversations..."
            />
        </div>
    );
};
