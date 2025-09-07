import React from 'react';
import { Pause, Play, Square, RotateCcw, AlertCircle } from 'lucide-react';

interface StreamingControlsProps {
    isStreaming: boolean;
    isPaused: boolean;
    canRetry: boolean;
    canPause: boolean;
    canResume: boolean;
    canAbort: boolean;
    error?: Error;
    onRetry: () => void;
    onAbort: () => void;
    onPause: () => void;
    onResume: () => void;
}

export const StreamingControls: React.FC<StreamingControlsProps> = ({
    isStreaming,
    isPaused,
    canRetry,
    canPause,
    canResume,
    canAbort,
    error,
    onRetry,
    onAbort,
    onPause,
    onResume,
}) => (
    <div className="flex items-center gap-2">
        {/* Status indicator */}
        {isStreaming && (
            <div className="flex items-center gap-2 text-blue-400 text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                Streaming...
            </div>
        )}

        {isPaused && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <Pause className="w-4 h-4" />
                Paused
            </div>
        )}

        {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error.message}
            </div>
        )}

        {/* Control buttons */}
        <div className="flex items-center gap-1 ml-auto">
            {canPause && (
                <button
                    onClick={onPause}
                    className="p-1 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 rounded transition-colors"
                    title="Pause streaming"
                >
                    <Pause className="w-4 h-4" />
                </button>
            )}

            {canResume && (
                <button
                    onClick={onResume}
                    className="p-1 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded transition-colors"
                    title="Resume streaming"
                >
                    <Play className="w-4 h-4" />
                </button>
            )}

            {canRetry && (
                <button
                    onClick={onRetry}
                    className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded transition-colors"
                    title="Retry streaming"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            )}

            {canAbort && (
                <button
                    onClick={onAbort}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                    title="Stop streaming"
                >
                    <Square className="w-4 h-4" />
                </button>
            )}
        </div>
    </div>
);
