import React from 'react';
import { MessageList } from '@/features/message';
import { InputBoxWithCompose, useChatViewModel } from '@/features/chat';

interface ChatContainerProps {
    threadId?: string;
    onThreadCreated?: (threadId: string) => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ threadId, onThreadCreated }) => {
    const { messages, loading, handleSendMessage, handleAbortStream } = useChatViewModel(threadId, onThreadCreated);

    const onSendMessage = async (content: string) => {
        await handleSendMessage(content);
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-md h-full flex flex-col border border-gray-700 min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden">
                <MessageList messages={messages} />
            </div>
            <div className="border-t border-gray-700 p-4 flex-shrink-0">
                {loading && (
                    <div className="mb-3 flex items-center justify-center">
                        <div className="flex items-center space-x-3 bg-blue-900/50 rounded-lg px-4 py-2 border border-blue-600">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <div
                                    className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                                    style={{ animationDelay: '0.2s' }}
                                ></div>
                                <div
                                    className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                                    style={{ animationDelay: '0.4s' }}
                                ></div>
                            </div>
                            <span className="text-blue-200 text-sm">AI가 응답하는 중...</span>
                            <button
                                onClick={handleAbortStream}
                                className="ml-3 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                중단
                            </button>
                        </div>
                    </div>
                )}
                <InputBoxWithCompose onSendMessage={onSendMessage} disabled={loading} />
            </div>
        </div>
    );
};

export default ChatContainer;
