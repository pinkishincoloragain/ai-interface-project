import React, { useEffect, useRef, useState } from 'react';
import { isEmpty, trimMessage } from '../../../utils/text-utils';
import { phrases } from '../../../utils/phrases';

interface InputProps {
    onSendMessage: (message: string) => void;
    withComposition?: boolean;
}

export const Input: React.FC<InputProps> = ({ onSendMessage, withComposition = false }) => {
    const [message, setMessage] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);

        // Auto height adjustment
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const shouldHandle = withComposition ? !isComposing : true;

        if (e.key === 'Enter' && !e.shiftKey && shouldHandle) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        const trimmedMessage = trimMessage(message);
        if (!isEmpty(message)) {
            onSendMessage(trimmedMessage);
            setMessage('');

            // Reset height after submit
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const compositionProps = withComposition
        ? {
              onCompositionStart: () => setIsComposing(true),
              onCompositionEnd: () => setIsComposing(false),
          }
        : {};

    return (
        <div className="flex items-end">
            <textarea
                ref={textareaRef}
                className="flex-1 resize-none border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder={phrases.ui.input.placeholder}
                rows={1}
                value={message}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                {...compositionProps}
            />
            <button
                className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                onClick={handleSubmit}
                disabled={isEmpty(message)}
            >
                {phrases.ui.input.sendButton}
            </button>
        </div>
    );
};
