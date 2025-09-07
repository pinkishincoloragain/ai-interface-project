import React from 'react';
import type { ChatMessage } from '@/entities/message';
import { StreamingMarkdown } from '@/shared/ui';

interface MarkdownMessageItemProps {
    message: ChatMessage;
    streamingContent?: string;
    isStreaming?: boolean;
}

const getStatusStyles = (status?: string) => {
    if (status === 'sending') return 'opacity-70';
    if (status === 'error') return 'border border-red-500';
    return '';
};

const MarkdownMessageItem: React.FC<MarkdownMessageItemProps> = React.memo(
    ({ message, streamingContent, isStreaming = false }) => {
        const isUser = message.role === 'user';

        // 사용자 메시지는 일반 텍스트로, 어시스턴트 메시지는 마크다운으로 렌더링
        const content = isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
            <StreamingMarkdown
                markdown={isStreaming ? streamingContent || '' : message.content}
                isStreaming={isStreaming}
                className="prose prose-sm max-w-none prose-invert prose-pre:bg-gray-700 prose-pre:p-2"
            />
        );

        return (
            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                    className={`max-w-3/4 rounded-lg px-4 py-2 ${
                        isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
                    } ${getStatusStyles(message.status)}
                }`}
                >
                    {content}
                    {message.status === 'sending' && message.role === 'assistant' && (
                        <div className="text-xs mt-1 opacity-70 flex items-center gap-1">
                            <div className="flex gap-1">
                                <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
                                <div
                                    className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"
                                    style={{ animationDelay: '0.2s' }}
                                ></div>
                                <div
                                    className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"
                                    style={{ animationDelay: '0.4s' }}
                                ></div>
                            </div>
                            {message.content === '' ? '생각 중...' : '입력 중...'}
                        </div>
                    )}
                    {message.status === 'error' && <div className="text-xs mt-1 text-red-400">오류 발생</div>}
                </div>
            </div>
        );
    }
);

MarkdownMessageItem.displayName = 'MarkdownMessageItem';

export default MarkdownMessageItem;
