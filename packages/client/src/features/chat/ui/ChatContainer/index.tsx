import React from 'react';
import { MessageList } from '@/features/message';
import { InputBoxWithCompose, useChatViewModel } from '@/features/chat';

interface ChatContainerProps {
    threadId?: string;
    onThreadCreated?: (threadId: string) => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ threadId, onThreadCreated }) => {
    const { messages, loading, handleSendMessage } = useChatViewModel(threadId);

    const onSendMessage = async (content: string) => {
        const newThreadId = await handleSendMessage(content);
        if (!threadId && newThreadId && onThreadCreated) {
            onThreadCreated(newThreadId);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-md h-full flex flex-col border border-gray-700 min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden">
                <MessageList messages={messages} />
            </div>
            <div className="border-t border-gray-700 p-4 flex-shrink-0">
                <InputBoxWithCompose onSendMessage={onSendMessage} disabled={loading} threadId={threadId} />
            </div>
        </div>
    );
};

export default ChatContainer;
