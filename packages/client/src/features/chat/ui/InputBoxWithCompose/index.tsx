import React, { useState } from 'react';
import { AutoResizeTextarea, ActionButton } from '@/shared/ui';

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
        if (trimmedMessage) {
            onSendMessage(trimmedMessage);
            setMessage('');
        }
    };

    return (
        <div className="flex items-end gap-2">
            <AutoResizeTextarea
                className="flex-1 border border-gray-600 bg-gray-700 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-400"
                placeholder="메시지를 입력하세요..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                disabled={disabled}
                maxHeight={200}
                minHeight={44}
            />
            {disabled && onStop ? (
                <ActionButton variant="danger" onClick={onStop}>
                    중지
                </ActionButton>
            ) : (
                <ActionButton variant="primary" onClick={handleSubmit} disabled={!message.trim() || disabled}>
                    전송
                </ActionButton>
            )}
        </div>
    );
};

export default InputBox;
