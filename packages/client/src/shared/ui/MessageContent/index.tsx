import React from 'react';
import { StreamingMarkdown } from '../StreamingMarkdown';

interface MessageContentProps {
    content: string;
    variant?: 'user' | 'assistant';
    streamingContent?: string;
    isStreaming?: boolean;
    className?: string;
}

export const MessageContent: React.FC<MessageContentProps> = ({
    content,
    variant = 'assistant',
    streamingContent,
    isStreaming = false,
    className = '',
}) => {
    const isUser = variant === 'user';

    if (isUser) {
        return <div className={`whitespace-pre-wrap ${className}`}>{content}</div>;
    }

    return (
        <StreamingMarkdown
            markdown={isStreaming ? streamingContent || '' : content}
            isStreaming={isStreaming}
            className={`prose prose-sm max-w-none prose-invert prose-pre:bg-gray-700 prose-pre:p-2 ${className}`}
        />
    );
};
