import React from 'react';
import { Edit, Search } from 'lucide-react';
import { SidebarButton } from '@/shared/ui';
import { threadPhrases } from '../../lib';

interface ThreadSidebarHeaderProps {
    isCollapsed?: boolean;
    onNewThread?: () => void;
    onOpenSearch?: () => void;
}

export const ThreadSidebarHeader: React.FC<ThreadSidebarHeaderProps> = ({
    isCollapsed = false,
    onNewThread,
    onOpenSearch,
}) => {
    if (isCollapsed) {
        return (
            <div className="flex flex-col space-y-1">
                {/* New Chat Button */}
                {onNewThread && (
                    <button
                        onClick={onNewThread}
                        className="w-full py-3 text-gray-200 hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center"
                        title={threadPhrases.newChat}
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                )}

                {/* Search Button */}
                <button
                    onClick={onOpenSearch}
                    className="w-full py-2.5 text-gray-200 hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center"
                    title={threadPhrases.searchChats}
                >
                    <Search className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {/* New Chat Button - Full width at top */}
            {onNewThread && <SidebarButton icon={Edit} title={threadPhrases.newChat} onClick={onNewThread} />}

            {/* Search Button */}
            <SidebarButton icon={Search} title={threadPhrases.searchChats} onClick={onOpenSearch} />
        </div>
    );
};
