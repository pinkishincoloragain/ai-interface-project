import { useMachine } from '@xstate/react';
import { simpleChatMachine, type SimpleChatEvent } from './simpleChatMachine';
import type { ChatMessage } from '@/entities/message';

export interface UseSimpleChatMachineReturn {
    // State
    messages: ChatMessage[];
    currentThreadId?: string;
    isLoading: boolean;
    isStreaming: boolean;
    isPaused: boolean;
    error?: Error;

    // Actions
    send: (event: SimpleChatEvent) => void;
    sendMessage: (content: string, threadId?: string) => void;
    retryStream: () => void;
    abortStream: () => void;
    pauseStream: () => void;
    resumeStream: () => void;
    loadMessages: (messages: ChatMessage[], threadId?: string) => void;
    clearMessages: () => void;
    setThread: (threadId: string) => void;
}

export function useSimpleChatMachine(): UseSimpleChatMachineReturn {
    const [state, send] = useMachine(simpleChatMachine);

    // Computed values
    const { messages } = state.context;
    const { currentThreadId } = state.context;
    const isLoading = state.matches('streaming') || state.matches('paused');
    const isStreaming = state.matches('streaming');
    const isPaused = state.matches('paused');
    const { error } = state.context;

    // Action creators
    const sendMessage = (content: string, threadId?: string) => {
        send({ type: 'SEND_MESSAGE', content, threadId });
    };

    const retryStream = () => {
        send({ type: 'RETRY' });
    };

    const abortStream = () => {
        send({ type: 'ABORT' });
    };

    const pauseStream = () => {
        send({ type: 'PAUSE' });
    };

    const resumeStream = () => {
        send({ type: 'RESUME' });
    };

    const loadMessages = (messages: ChatMessage[], threadId?: string) => {
        send({ type: 'LOAD_MESSAGES', messages, threadId });
    };

    const clearMessages = () => {
        send({ type: 'CLEAR_MESSAGES' });
    };

    const setThread = (threadId: string) => {
        send({ type: 'SET_THREAD', threadId });
    };

    return {
        messages,
        currentThreadId,
        isLoading,
        isStreaming,
        isPaused,
        error,
        send,
        sendMessage,
        retryStream,
        abortStream,
        pauseStream,
        resumeStream,
        loadMessages,
        clearMessages,
        setThread,
    };
}
