import React, { useEffect, useRef, forwardRef } from 'react';

interface AutoResizeTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> {
    maxHeight?: number;
    minHeight?: number;
    onHeightChange?: (height: number) => void;
}

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
    ({ maxHeight = 200, minHeight = 40, onHeightChange, className = '', ...props }, ref) => {
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const combinedRef = ref || textareaRef;

        useEffect(() => {
            const textarea = typeof combinedRef === 'object' ? combinedRef.current : null;
            if (textarea) {
                textarea.focus();
            }
        }, [combinedRef]);

        const adjustHeight = () => {
            const textarea = typeof combinedRef === 'object' ? combinedRef.current : null;
            if (!textarea) return;

            textarea.style.height = 'auto';
            const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
            textarea.style.height = `${newHeight}px`;

            onHeightChange?.(newHeight);
        };

        const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
            adjustHeight();
            props.onInput?.(e);
        };

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            adjustHeight();
            props.onChange?.(e);
        };

        useEffect(() => {
            adjustHeight();
        }, [props.value, maxHeight, minHeight]);

        return (
            <textarea
                {...props}
                ref={combinedRef}
                onInput={handleInput}
                onChange={handleChange}
                className={`resize-none overflow-hidden ${className}`}
                style={{
                    minHeight: `${minHeight}px`,
                    maxHeight: `${maxHeight}px`,
                    ...props.style,
                }}
                rows={1}
            />
        );
    }
);

AutoResizeTextarea.displayName = 'AutoResizeTextarea';
