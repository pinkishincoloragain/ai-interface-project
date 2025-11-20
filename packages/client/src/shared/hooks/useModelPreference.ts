import { useState, useEffect } from 'react';

export type GPTModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-4' | 'gpt-3.5-turbo';

const MODEL_STORAGE_KEY = 'gpt-model-preference';
const DEFAULT_MODEL: GPTModel = 'gpt-4o-mini';

export const GPT_MODELS: { value: GPTModel; label: string; description: string }[] = [
    {
        value: 'gpt-4o',
        label: 'GPT-4o',
        description: 'Most capable multimodal model, best for complex tasks',
    },
    {
        value: 'gpt-4o-mini',
        label: 'GPT-4o Mini',
        description: 'Fast and cost-effective for most tasks',
    },
    {
        value: 'gpt-4-turbo',
        label: 'GPT-4 Turbo',
        description: 'Advanced model with extended context window',
    },
    {
        value: 'gpt-4',
        label: 'GPT-4',
        description: 'Powerful model for complex reasoning',
    },
    {
        value: 'gpt-3.5-turbo',
        label: 'GPT-3.5 Turbo',
        description: 'Fast and efficient for simple tasks',
    },
];

export function useModelPreference() {
    const [model, setModelState] = useState<GPTModel>(() => {
        try {
            const stored = localStorage.getItem(MODEL_STORAGE_KEY);
            if (stored && GPT_MODELS.some((m) => m.value === stored)) {
                return stored as GPTModel;
            }
        } catch (error) {
            console.error('Failed to load model preference:', error);
        }
        return DEFAULT_MODEL;
    });

    const setModel = (newModel: GPTModel) => {
        try {
            localStorage.setItem(MODEL_STORAGE_KEY, newModel);
            setModelState(newModel);
        } catch (error) {
            console.error('Failed to save model preference:', error);
        }
    };

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === MODEL_STORAGE_KEY && e.newValue) {
                const newModel = e.newValue as GPTModel;
                if (GPT_MODELS.some((m) => m.value === newModel)) {
                    setModelState(newModel);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return { model, setModel, availableModels: GPT_MODELS };
}
