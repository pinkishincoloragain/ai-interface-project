import React from 'react';
import { MessageArea } from '@/shared/ui';
import { MessageItem } from '@/features/message';
import type { ChatMessage } from '@/entities/message';

interface MessageListProps {
    messages: ChatMessage[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => (
    <MessageArea
        itemCount={messages.length}
        emptyContent="대화를 시작해보세요."
        autoScroll={true}
        showScrollButton={true}
    >
        <div className="w-full space-y-4">
            {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
            ))}
        </div>
    </MessageArea>
);

export default MessageList;
