import React from 'react';

interface MessageBubbleProps {
    children: React.ReactNode;
    variant?: 'user' | 'assistant';
    status?: 'sending' | 'success' | 'error';
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
        <div className={`flex ${isUser ? 'justify-end' : 'justify-center'}`}>
            <div
                className={`rounded-lg py-2 text-white ${
                    isUser ? 'px-4 bg-blue-600' : 'px-0 w-full'
                } ${getStatusStyles(status)} ${className}`}
            >
                {children}
            </div>
        </div>
    );
};
