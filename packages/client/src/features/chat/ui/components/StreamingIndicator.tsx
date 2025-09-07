import React from 'react';

interface StreamingIndicatorProps {
    isStreaming: boolean;
    className?: string;
}

/**
 * Reusable component to show streaming state
 * Following SRP: Only handles streaming visual feedback
 */
export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ isStreaming, className = '' }) => {
    if (!isStreaming) return null;

    return (
        <div className={`flex items-center gap-2 text-blue-400 ${className}`}>
            <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            </div>
            <span className="text-sm">AI is thinking...</span>
        </div>
    );
};
