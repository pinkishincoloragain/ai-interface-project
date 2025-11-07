import React from 'react';

interface MessageBubbleProps {
    children: React.ReactNode;
    variant?: 'user' | 'assistant';
    status?: 'sending' | 'error';
    className?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    children,
    variant = 'assistant',
    status,
    className = '',
}) => {
    const getStatusStyles = (status?: string) => {
        if (status === 'sending') return 'opacity-70';
        if (status === 'error') return 'border border-red-500';
        return '';
    };

    const isUser = variant === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-3/4 rounded-lg px-4 py-2 ${
                    isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
                } ${getStatusStyles(status)} ${className}`}
            >
                {children}
            </div>
        </div>
    );
};
