import React, { useCallback } from 'react';
import { MessageList } from '@/features/message';
import { InputBoxWithCompose } from '@/features/chat';
import { useChatViewModelXState } from '../../lib/useChatViewModelXState';
import { StreamingControls } from './StreamingControls';

interface XStateChatContainerProps {
    threadId?: string;
    onThreadCreated?: (threadId: string) => void;
}

const XStateChatContainer: React.FC<XStateChatContainerProps> = React.memo(({ threadId, onThreadCreated }) => {
    const {
        messages,
        loading,
        isStreaming,
        isPaused,
        canRetry,
        canPause,
        canResume,
        canAbort,
        handleSendMessage,
        handleRetryStream,
        handleAbortStream,
        handlePauseStream,
        handleResumeStream,
        error,
    } = useChatViewModelXState(threadId);

    const onSendMessage = useCallback(
        async (content: string) => {
            const newThreadId = await handleSendMessage(content);
            if (!threadId && newThreadId && onThreadCreated) {
                setTimeout(() => {
                    onThreadCreated(newThreadId);
                }, 100);
            }
        },
        [handleSendMessage, threadId, onThreadCreated]
    );

    return (
        <div className="bg-gray-800 rounded-lg shadow-md h-full flex flex-col border border-gray-700 min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden">
                <MessageList messages={messages} />
            </div>

            {/* Streaming Controls */}
            {(isStreaming || isPaused || error) && (
                <div className="border-t border-gray-700 px-4 py-2">
                    <StreamingControls
                        isStreaming={isStreaming}
                        isPaused={isPaused}
                        canRetry={canRetry}
                        canPause={canPause}
                        canResume={canResume}
                        canAbort={canAbort}
                        error={error || undefined}
                        onRetry={handleRetryStream}
                        onAbort={handleAbortStream}
                        onPause={handlePauseStream}
                        onResume={handleResumeStream}
                    />
                </div>
            )}

            <div className="border-t border-gray-700 p-4 flex-shrink-0">
                <InputBoxWithCompose onSendMessage={onSendMessage} disabled={loading} />
            </div>
        </div>
    );
});

XStateChatContainer.displayName = 'XStateChatContainer';

export default XStateChatContainer;
