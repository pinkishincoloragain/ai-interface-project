import React from 'react';
import type { ChatMessage } from '@/entities/message';
import { MessageBubble, MessageContent, MessageStatus } from '@/shared/ui';

interface MarkdownMessageItemProps {
    message: ChatMessage;
    streamingContent?: string;
    isStreaming?: boolean;
}

const MarkdownMessageItem: React.FC<MarkdownMessageItemProps> = React.memo(
    ({ message, streamingContent, isStreaming = false }) => {
        const variant = message.role === 'user' ? 'user' : 'assistant';

        return (
            <MessageBubble variant={variant} status={message.status}>
                <MessageContent
                    content={message.content}
                    variant={variant}
                    streamingContent={streamingContent}
                    isStreaming={isStreaming}
                />
                <MessageStatus status={message.status} role={message.role} isEmpty={message.content === ''} />
            </MessageBubble>
        );
    }
);

MarkdownMessageItem.displayName = 'MarkdownMessageItem';

export default MarkdownMessageItem;
