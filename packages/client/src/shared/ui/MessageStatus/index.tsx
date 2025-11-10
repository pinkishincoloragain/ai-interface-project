import React from 'react';

interface MessageStatusProps {
    status?: 'sending' | 'success' | 'error';
    role?: 'user' | 'assistant' | 'system';
    isEmpty?: boolean;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ status, role, isEmpty = false }) => {
    if (status === 'sending' && role === 'assistant') {
        return (
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
                {isEmpty ? '생각 중...' : '입력 중...'}
            </div>
        );
    }

    if (status === 'error') {
        return <div className="text-xs mt-1 text-red-400">오류 발생</div>;
    }

    return null;
};
