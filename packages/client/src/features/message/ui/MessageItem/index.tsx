import React, { useState, useCallback } from 'react';
import { ChatMessage } from '@/shared';
import { StreamingMarkdown } from '@/shared/ui';

interface MarkdownMessageItemProps {
    message: ChatMessage;
    streamingContent?: string;
    isStreaming?: boolean;
    onRetry?: (messageId: string) => void;
}

const getStatusStyles = (status?: string, isUser?: boolean) => {
    if (status === 'sending') return 'opacity-70 transition-opacity duration-200';
    if (status === 'error') return `border ${isUser ? 'border-red-400' : 'border-red-500'} shadow-red-500/25 shadow-sm`;
    return '';
};

const LoadingDots: React.FC<{ text: string }> = ({ text }) => (
    <div className="text-xs mt-2 opacity-80 flex items-center gap-2" role="status" aria-label={text}>
        <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div
                className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.1s' }}
            ></div>
            <div
                className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
            ></div>
        </div>
        <span className="text-blue-300 font-medium">{text}</span>
    </div>
);

const ErrorMessage: React.FC<{
    message: ChatMessage;
    onRetry?: (messageId: string) => void;
    isUser?: boolean;
}> = ({ message, onRetry, isUser }) => {
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = useCallback(async () => {
        if (!onRetry || isRetrying) return;

        setIsRetrying(true);
        try {
            await onRetry(message.id);
        } finally {
            // Reset retrying state after a delay to prevent rapid clicks
            setTimeout(() => setIsRetrying(false), 1000);
        }
    }, [onRetry, message.id, isRetrying]);

    return (
        <div className="mt-2 p-2 bg-red-900/30 border border-red-700/50 rounded-md">
            <div className="flex items-start gap-2">
                <div className="flex-shrink-0">
                    <svg
                        className="w-4 h-4 text-red-400 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-red-300">
                        {isUser ? '메시지 전송에 실패했습니다.' : '응답을 받는 중 오류가 발생했습니다.'}
                    </p>
                    <p className="text-xs text-red-400 mt-1 opacity-75">
                        네트워크 연결을 확인하거나 잠시 후 다시 시도해 주세요.
                    </p>
                </div>
                {onRetry && !isUser && (
                    <button
                        onClick={handleRetry}
                        disabled={isRetrying}
                        className="flex-shrink-0 text-xs bg-red-700 hover:bg-red-600 disabled:bg-red-800 text-white px-2 py-1 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="메시지 재전송"
                    >
                        {isRetrying ? (
                            <div className="flex items-center gap-1">
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                재시도 중
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                재시도
                            </div>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

const MessageTimestamp: React.FC<{ timestamp: string }> = ({ timestamp }) => {
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return '방금 전';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;

        return date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    };

    return (
        <div className="text-xs text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {formatTime(timestamp)}
        </div>
    );
};

const MarkdownMessageItem: React.FC<MarkdownMessageItemProps> = ({
    message,
    streamingContent,
    isStreaming = false,
    onRetry,
}) => {
    const isUser = message.role === 'user';
    const [isHovered, setIsHovered] = useState(false);

    // 사용자 메시지는 일반 텍스트로, 어시스턴트 메시지는 마크다운으로 렌더링
    const content = isUser ? (
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
    ) : (
        <StreamingMarkdown
            markdown={isStreaming ? streamingContent || '' : message.content}
            isStreaming={isStreaming}
            className="prose prose-sm max-w-none prose-invert prose-pre:bg-gray-700 prose-pre:p-2 prose-code:text-purple-300 prose-code:bg-gray-800/50 prose-code:px-1 prose-code:rounded"
        />
    );

    return (
        <div
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`max-w-[85%] sm:max-w-3/4`}>
                <div
                    className={`rounded-lg px-4 py-3 ${
                        isUser ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-700 text-white rounded-bl-sm'
                    } ${getStatusStyles(message.status, isUser)} 
                    transition-all duration-200 hover:shadow-lg ${
                        message.status === 'error' ? 'hover:shadow-red-500/20' : 'hover:shadow-black/20'
                    }`}
                    role="article"
                    aria-label={`${isUser ? '사용자' : '어시스턴트'} 메시지`}
                >
                    {content}

                    {message.status === 'sending' && message.role === 'assistant' && (
                        <LoadingDots text={message.content === '' ? '생각 중...' : '입력 중...'} />
                    )}

                    {message.status === 'error' && <ErrorMessage message={message} onRetry={onRetry} isUser={isUser} />}
                </div>

                {(isHovered || message.status === 'error') && <MessageTimestamp timestamp={message.createdAt} />}
            </div>
        </div>
    );
};

export default MarkdownMessageItem;
