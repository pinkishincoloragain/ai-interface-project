import React, { useEffect, useRef, useState } from 'react';
import { MessageItem } from '@/features/message';
import { ChatMessage } from '@/shared';

interface MessageListProps {
    messages: ChatMessage[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [userScrolled, setUserScrolled] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
            block: 'end',
        });
    };

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        setUserScrolled(!isNearBottom);
        setShowScrollButton(!isNearBottom && messages.length > 0);
    };

    const throttledHandleScroll = React.useCallback(() => {
        let ticking = false;
        return () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };
    }, [])();

    // Auto-scroll logic: only scroll automatically if user hasn't manually scrolled up
    useEffect(() => {
        if (!userScrolled) {
            scrollToBottom();
        }
    }, [messages, userScrolled]);

    // Reset user scrolled state when messages are cleared (new conversation)
    useEffect(() => {
        if (messages.length === 0) {
            setUserScrolled(false);
            setShowScrollButton(false);
        }
    }, [messages.length]);

    const handleScrollToBottom = () => {
        setUserScrolled(false);
        scrollToBottom();
    };

    return (
        <div className="relative h-full flex flex-col">
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 scrollbar-hide"
                onScroll={throttledHandleScroll}
                style={{
                    scrollBehavior: 'smooth',
                    willChange: 'scroll-position',
                    transform: 'translateZ(0)', // Force hardware acceleration
                }}
            >
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">대화를 시작해보세요.</div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <MessageItem key={message.id} message={message} />
                        ))}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollButton && (
                <button
                    onClick={handleScrollToBottom}
                    className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 z-10"
                    title="맨 아래로 스크롤"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
};

export default MessageList;
