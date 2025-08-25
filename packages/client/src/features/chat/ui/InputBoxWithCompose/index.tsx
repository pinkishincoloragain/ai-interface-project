import React, { useEffect, useRef, useState } from 'react';

interface InputBoxProps {
    onSendMessage: (message: string) => void;
    disabled?: boolean;
}

const InputBox: React.FC<InputBoxProps> = ({ onSendMessage, disabled = false }) => {
    const [message, setMessage] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const handleWindowFocus = () => {
            textareaRef.current?.focus();
        };

        // 처음 컴포넌트가 마운트 될때 포커스
        handleWindowFocus();

        // 윈도우 focus 시 포커스 > 사용자가 브라우저 창을 다시 활성화했을 때 입력창에 자동으로 포커스를 맞춰 UX 향상
        window.addEventListener('focus', handleWindowFocus);
        return () => window.removeEventListener('focus', handleWindowFocus);
    }, []);

    // 메시지 응답 완료 후 입력창 포커스
    useEffect(() => {
        if (!disabled) {
            textareaRef.current?.focus();
        }
    }, [disabled]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);

        // 자동 높이 조절
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

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

            // 제출 후 높이 초기화
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    return (
        <div className="flex items-end">
            <textarea
                ref={textareaRef}
                className="flex-1 resize-none border border-gray-600 bg-gray-700 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-400"
                placeholder="메시지를 입력하세요..."
                rows={1}
                value={message}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                disabled={disabled}
            />
            <button
                className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={handleSubmit}
                disabled={!message.trim() || disabled}
            >
                전송
            </button>
        </div>
    );
};

export default InputBox;
