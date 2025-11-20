import React from 'react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { useModelPreference } from '@/shared/hooks';

export const ModelSelectionSection: React.FC = () => {
    const { model, setModel, availableModels } = useModelPreference();

    return (
        <div className="flex flex-col h-full bg-gray-950">
            <div className="p-6 border-b border-gray-700">
                <div>
                    <h2 className="text-lg font-semibold text-gray-100">GPT Model Selection</h2>
                    <p className="text-sm text-gray-400">Choose the AI model for your conversations</p>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-6">
                    <div className="max-w-2xl space-y-3">
                        {availableModels.map((modelOption) => (
                            <button
                                key={modelOption.value}
                                onClick={() => setModel(modelOption.value)}
                                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                                    model === modelOption.value
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="text-base font-semibold text-gray-100">
                                                {modelOption.label}
                                            </h3>
                                            {model === modelOption.value && (
                                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400 mt-1">{modelOption.description}</p>
                                    </div>
                                    <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                            model === modelOption.value ? 'border-blue-500' : 'border-gray-600'
                                        }`}
                                    >
                                        {model === modelOption.value && (
                                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700 max-w-2xl">
                        <p className="text-sm text-gray-300">
                            <strong className="text-gray-100">Note:</strong> The selected model will be used for all new
                            conversations. Different models have varying capabilities, speeds, and costs.
                        </p>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};
