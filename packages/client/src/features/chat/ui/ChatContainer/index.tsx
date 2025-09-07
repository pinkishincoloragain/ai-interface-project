import React, { useCallback } from 'react';
import { MessageList } from '@/features/message';
import { InputBoxWithCompose, useChatViewModel } from '@/features/chat';

interface ChatContainerProps {
    threadId?: string;
    onThreadCreated?: (threadId: string) => void;
}

const ChatContainer: React.FC<ChatContainerProps> = React.memo(({ threadId, onThreadCreated }) => {
    const { messages, loading, handleSendMessage } = useChatViewModel(threadId);

    const onSendMessage = useCallback(
        async (content: string) => {
            const newThreadId = await handleSendMessage(content);
            // Only call onThreadCreated if we don't have a current thread
            // This prevents blinking when creating the first message
            if (!threadId && newThreadId && onThreadCreated) {
                // Delay thread creation callback to prevent re-render during streaming
                // This allows the assistant message to render smoothly first
                setTimeout(() => {
                    onThreadCreated(newThreadId);
                }, 500); // Increased delay to ensure smooth streaming
            }
        },
        [handleSendMessage, threadId, onThreadCreated]
    );

    return (
        <div className="bg-gray-800 rounded-lg shadow-md h-full flex flex-col border border-gray-700 min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden">
                <MessageList messages={messages} />
            </div>
            <div className="border-t border-gray-700 p-4 flex-shrink-0">
                <InputBoxWithCompose onSendMessage={onSendMessage} disabled={loading} />
            </div>
        </div>
    );
});

ChatContainer.displayName = 'ChatContainer';

export default ChatContainer;
