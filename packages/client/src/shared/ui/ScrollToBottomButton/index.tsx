import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ScrollToBottomButtonProps {
    onClick: () => void;
    className?: string;
    title?: string;
}

export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
    onClick,
    className = '',
    title = 'Scroll to bottom',
}) => (
    <button
        onClick={onClick}
        className={`bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 z-10 ${className}`}
        title={title}
    >
        <ChevronDown className="w-4 h-4" />
    </button>
);
