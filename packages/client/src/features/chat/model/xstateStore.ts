import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createActor } from 'xstate';
import { chatMachine, type ChatMachine } from './chatMachine';
import type { ChatMessage } from '@/entities/message';

export interface XStateChatState {
    // XState actor
    chatActor: ReturnType<typeof createActor<ChatMachine>> | null;

    // Derived state (computed from XState)
    messages: ChatMessage[];
    currentThreadId?: string;
    isLoading: boolean;
    isStreaming: boolean;
    isPaused: boolean;
    error?: Error;

    // Actions
    initializeActor: () => void;
    sendMessage: (content: string, threadId?: string) => void;
    loadMessages: (messages: ChatMessage[], threadId?: string) => void;
    clearMessages: () => void;
    setThread: (threadId: string) => void;
    retryStream: () => void;
    abortStream: () => void;
    pauseStream: () => void;
    resumeStream: () => void;
    dispose: () => void;
}

export const useXStateChatStore = create<XStateChatState>()(
    devtools(
        (set, get) => ({
            // Initial state
            chatActor: null,
            messages: [],
            currentThreadId: undefined,
            isLoading: false,
            isStreaming: false,
            isPaused: false,
            error: undefined,

            initializeActor: () => {
                const existingActor = get().chatActor;
                if (existingActor) {
                    existingActor.stop();
                }

                const actor = createActor(chatMachine);

                // Subscribe to state changes
                actor.subscribe((state) => {
                    set({
                        messages: state.context.messages,
                        currentThreadId: state.context.currentThreadId,
                        isLoading: state.matches('sending') || state.matches('paused'),
                        isStreaming: state.matches('sending'),
                        isPaused: state.matches('paused'),
                        error: state.context.error,
                    });
                });

                actor.start();

                set({ chatActor: actor });
            },

            sendMessage: (content: string, threadId?: string) => {
                const { chatActor } = get();
                if (!chatActor) {
                    console.warn('Chat actor not initialized');
                    return;
                }

                chatActor.send({
                    type: 'SEND_MESSAGE',
                    content,
                    threadId,
                });
            },

            loadMessages: (messages: ChatMessage[], threadId?: string) => {
                const { chatActor } = get();
                if (!chatActor) {
                    console.warn('Chat actor not initialized');
                    return;
                }

                chatActor.send({
                    type: 'LOAD_MESSAGES',
                    messages,
                    threadId,
                });
            },

            clearMessages: () => {
                const { chatActor } = get();
                if (!chatActor) {
                    console.warn('Chat actor not initialized');
                    return;
                }

                chatActor.send({ type: 'CLEAR_MESSAGES' });
            },

            setThread: (threadId: string) => {
                const { chatActor } = get();
                if (!chatActor) {
                    console.warn('Chat actor not initialized');
                    return;
                }

                chatActor.send({
                    type: 'SET_THREAD',
                    threadId,
                });
            },

            retryStream: () => {
                const { chatActor } = get();
                if (!chatActor) {
                    console.warn('Chat actor not initialized');
                    return;
                }

                chatActor.send({ type: 'RETRY_STREAM' });
            },

            abortStream: () => {
                const { chatActor } = get();
                if (!chatActor) {
                    console.warn('Chat actor not initialized');
                    return;
                }

                chatActor.send({ type: 'ABORT_STREAM' });
            },

            pauseStream: () => {
                const { chatActor } = get();
                if (!chatActor) {
                    console.warn('Chat actor not initialized');
                    return;
                }

                chatActor.send({ type: 'PAUSE_STREAM' });
            },

            resumeStream: () => {
                const { chatActor } = get();
                if (!chatActor) {
                    console.warn('Chat actor not initialized');
                    return;
                }

                chatActor.send({ type: 'RESUME_STREAM' });
            },

            dispose: () => {
                const { chatActor } = get();
                if (chatActor) {
                    chatActor.stop();
                    set({ chatActor: null });
                }
            },
        }),
        {
            name: 'xstate-chat-store',
        }
    )
);
