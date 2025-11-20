import React, { useState } from 'react';
import { AutoResizeTextarea } from '@/shared/ui';
import { Send, Square } from 'lucide-react';
import { chatPhrases } from '../../lib';

interface InputBoxProps {
    onSendMessage: (message: string) => void;
    disabled?: boolean;
    onStop?: () => void;
}

const InputBox: React.FC<InputBoxProps> = ({ onSendMessage, disabled = false, onStop }) => {
    const [message, setMessage] = useState('');
    const [isComposing, setIsComposing] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // IME 입력 중이 아닐 때만 Enter 키 처리
        if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        const trimmedMessage = message.trim();
        if (trimmedMessage && !disabled) {
            onSendMessage(trimmedMessage);
            setMessage('');
        }
    };

    const handleButtonClick = () => {
        if (disabled && onStop) {
            onStop();
        } else {
            handleSubmit();
        }
    };

    const isButtonEnabled = disabled ? true : message.trim().length > 0;

    return (
        <div className="w-full max-w-[768px] mx-auto">
            <div className="relative">
                <AutoResizeTextarea
                    className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-400"
                    placeholder={chatPhrases.inputPlaceholder}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    disabled={disabled}
                    maxHeight={200}
                    minHeight={44}
                />
                <button
                    onClick={handleButtonClick}
                    disabled={!isButtonEnabled}
                    className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all duration-200 ${
                        disabled
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : isButtonEnabled
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                    aria-label={disabled ? chatPhrases.stop : chatPhrases.send}
                >
                    {disabled ? <Square size={20} fill="currentColor" /> : <Send size={20} />}
                </button>
            </div>
        </div>
    );
};

export default InputBox;
