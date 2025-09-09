import React from 'react';

interface ChatHeaderProps {
    title: string;
    isLoading: boolean;
    onStop?: () => void;
    className?: string;
}

/**
 * Reusable chat header component
 * Following SRP: Only handles chat header display and controls
 */
export const ChatHeader: React.FC<ChatHeaderProps> = ({ title, isLoading, onStop, className = '' }) => (
    <div className={`flex items-center justify-between p-4 border-b border-gray-700 ${className}`}>
        <h2 className="text-lg font-medium text-gray-100">{title}</h2>
        {isLoading && onStop && (
            <button
                onClick={onStop}
                className="text-sm text-red-400 hover:text-red-300 px-3 py-1 rounded border border-red-400 hover:border-red-300 transition-colors"
            >
                Stop
            </button>
        )}
    </div>
);
