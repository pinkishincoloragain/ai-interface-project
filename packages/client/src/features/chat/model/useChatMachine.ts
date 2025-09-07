import { useMachine } from '@xstate/react';
import { chatMachine, type ChatEvent } from './chatMachine';
import type { ChatMessage } from '@/entities/message';

export interface UseChatMachineReturn {
    state: ReturnType<typeof useMachine<typeof chatMachine>>[0];
    send: (event: ChatEvent) => void;

    // Computed values
    messages: ChatMessage[];
    currentThreadId?: string;
    isLoading: boolean;
    isStreaming: boolean;
    isPaused: boolean;
    error?: Error;

    // Actions
    sendMessage: (content: string, threadId?: string) => void;
    retryStream: () => void;
    abortStream: () => void;
    pauseStream: () => void;
    resumeStream: () => void;
    loadMessages: (messages: ChatMessage[], threadId?: string) => void;
    clearMessages: () => void;
    setThread: (threadId: string) => void;
}

export function useChatMachine(): UseChatMachineReturn {
    const [state, send] = useMachine(chatMachine);

    // Computed values
    const { messages } = state.context;
    const { currentThreadId } = state.context;
    const isLoading = state.matches('sending') || state.matches('paused');
    const isStreaming = state.matches('sending');
    const isPaused = state.matches('paused');
    const { error } = state.context;

    // Action creators
    const sendMessage = (content: string, threadId?: string) => {
        send({ type: 'SEND_MESSAGE', content, threadId });
    };

    const retryStream = () => {
        send({ type: 'RETRY_STREAM' });
    };

    const abortStream = () => {
        send({ type: 'ABORT_STREAM' });
    };

    const pauseStream = () => {
        send({ type: 'PAUSE_STREAM' });
    };

    const resumeStream = () => {
        send({ type: 'RESUME_STREAM' });
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
        state,
        send,
        messages,
        currentThreadId,
        isLoading,
        isStreaming,
        isPaused,
        error,
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
