import React, { useCallback } from 'react';
import { MessageList } from '@/features/message';
import { InputBoxWithCompose } from '@/features/chat';
import { useChat, useNavigationAbort } from '../../hooks';
import { StreamingIndicator } from '../components';

interface ChatContainerProps {
    threadId?: string;
    onThreadCreated?: (threadId: string) => void;
}

const ChatContainer: React.FC<ChatContainerProps> = React.memo(({ threadId, onThreadCreated }) => {
    const { messages, isStreaming, handleSendMessage, stopStreaming } = useChat(threadId);

    // Ensure cleanup on component unmount or navigation
    useNavigationAbort();

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
        <div className="rounded-lg shadow-md h-full flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden">
                <MessageList messages={messages} />
                <StreamingIndicator isStreaming={isStreaming} className="px-4 pt-2" />
                <div className="p-4 pb-0 bg-transparent">
                    <InputBoxWithCompose
                        onSendMessage={onSendMessage}
                        disabled={isStreaming}
                        onStop={isStreaming ? stopStreaming : undefined}
                    />
                </div>
            </div>
            {/* <div className="border-gray-700 flex-shrink-0">*/}

            {/* </div>*/}
        </div>
    );
});

ChatContainer.displayName = 'ChatContainer';

export default ChatContainer;
