import React from 'react';
import { Settings } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface ThreadSidebarFooterProps {
    isCollapsed?: boolean;
}

export const ThreadSidebarFooter: React.FC<ThreadSidebarFooterProps> = ({ isCollapsed = false }) => {
    if (isCollapsed) {
        return (
            <div className="px-2 py-6">
                <Link
                    to="/settings"
                    className="w-full py-2.5 text-gray-200 hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center"
                    title="Settings"
                >
                    <Settings className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="px-2 py-6">
            <Link
                to="/settings"
                className="w-full px-3 py-2.5 bg-transparent hover:bg-gray-800 text-gray-200 text-sm rounded-lg transition-colors flex items-center justify-start gap-2"
                title="Settings"
            >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
            </Link>
        </div>
    );
};
