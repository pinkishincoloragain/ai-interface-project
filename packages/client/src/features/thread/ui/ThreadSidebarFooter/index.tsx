import React from 'react';
import { Settings } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface ThreadSidebarFooterProps {
    isCollapsed?: boolean;
}

export const ThreadSidebarFooter: React.FC<ThreadSidebarFooterProps> = ({ isCollapsed = false }) => {
    if (isCollapsed) {
        return (
            <div className="p-2">
                <Link
                    to="/settings"
                    className="w-full p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center"
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4">
            <Link
                to="/settings"
                className="w-full p-3 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors flex items-center space-x-3 group"
            >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">Settings</span>
            </Link>
        </div>
    );
};
