import { useEffect } from 'react';

export interface KeyboardShortcutOptions {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
    enabled?: boolean;
}

export const useKeyboardShortcut = (
    options: KeyboardShortcutOptions,
    callback: (event: KeyboardEvent) => void
): void => {
    const { key, ctrl = false, shift = false, alt = false, meta = false, enabled = true } = options;

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            // Check if the key matches
            if (event.key.toLowerCase() !== key.toLowerCase()) {
                return;
            }

            // Check if modifiers match
            if (event.ctrlKey !== ctrl) return;
            if (event.shiftKey !== shift) return;
            if (event.altKey !== alt) return;
            if (event.metaKey !== meta) return;

            // Prevent default behavior and execute callback
            event.preventDefault();
            callback(event);
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [key, ctrl, shift, alt, meta, enabled, callback]);
};

export interface ModifierKeyOptions {
    key: string;
    modifier?: boolean;
    shift?: boolean;
    alt?: boolean;
    enabled?: boolean;
}

export const useModifierKeyShortcut = (options: ModifierKeyOptions, callback: (event: KeyboardEvent) => void): void => {
    const { key, modifier = false, shift = false, alt = false, enabled = true } = options;

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            // Check if the key matches
            if (event.key.toLowerCase() !== key.toLowerCase()) {
                return;
            }

            // Check if modifier key is pressed (Cmd on Mac, Ctrl on Windows/Linux)
            const modifierPressed = event.metaKey || event.ctrlKey;
            if (modifier && !modifierPressed) return;
            if (!modifier && modifierPressed) return;

            // Check if modifiers match
            if (event.shiftKey !== shift) return;
            if (event.altKey !== alt) return;

            // Prevent default behavior and execute callback
            event.preventDefault();
            callback(event);
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [key, modifier, shift, alt, enabled, callback]);
};
