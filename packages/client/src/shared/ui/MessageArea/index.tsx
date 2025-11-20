import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ScrollToBottomButton } from '../ScrollToBottomButton';

interface MessageAreaProps {
    children: React.ReactNode;
    itemCount: number;
    emptyContent?: React.ReactNode;
    className?: string;
    autoScroll?: boolean;
    showScrollButton?: boolean;
}

export const MessageArea: React.FC<MessageAreaProps> = ({
    children,
    itemCount,
    emptyContent,
    className = '',
    autoScroll = true,
    showScrollButton = true,
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [userScrolled, setUserScrolled] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const scrollToBottom = useCallback((smooth = true) => {
        messagesEndRef.current?.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
            block: 'end',
        });
    }, []);

    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        setUserScrolled(!isNearBottom);
        setShowScrollBtn(!isNearBottom && itemCount > 0 && showScrollButton);
    }, [itemCount, showScrollButton]);

    const throttledHandleScroll = useCallback(() => {
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
    }, [handleScroll])();

    // Auto-scroll logic: only scroll automatically if user hasn't manually scrolled up
    useEffect(() => {
        if (autoScroll && !userScrolled) {
            scrollToBottom();
        }
    }, [itemCount, userScrolled, autoScroll, scrollToBottom]);

    // Reset user scrolled state when messages are cleared (new conversation)
    useEffect(() => {
        if (itemCount === 0) {
            setUserScrolled(false);
            setShowScrollBtn(false);
        }
    }, [itemCount]);

    const handleScrollToBottom = () => {
        setUserScrolled(false);
        scrollToBottom();
    };

    return (
        <div className={`relative h-full flex flex-col justify-center items-center ${className}`}>
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-[25%]"
                onScroll={throttledHandleScroll}
                style={{
                    scrollBehavior: 'smooth',
                    willChange: 'scroll-position',
                    transform: 'translateZ(0)', // Force hardware acceleration
                }}
            >
                {itemCount === 0 && emptyContent ? (
                    <div className="flex items-center justify-center h-full text-gray-400">{emptyContent}</div>
                ) : (
                    <>
                        {children}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Scroll to bottom button */}
            {showScrollBtn && (
                <ScrollToBottomButton
                    onClick={handleScrollToBottom}
                    className="absolute bottom-4 right-4"
                    title="맨 아래로 스크롤"
                />
            )}
        </div>
    );
};
