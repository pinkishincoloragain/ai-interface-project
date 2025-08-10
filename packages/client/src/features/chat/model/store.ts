import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ChatMessage } from '@/shared';
import { getStreamingManager } from '../lib/streamingController';

export interface ChatState {
    messages: ChatMessage[];
    currentThreadId?: string;
    loading: boolean;
    isStreaming: boolean;
    currentStreamId?: string;

    // Actions
    setMessages: (messages: ChatMessage[]) => void;
    addMessage: (message: ChatMessage) => void;
    updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
    removeMessage: (messageId: string) => void;
    setCurrentThreadId: (threadId?: string) => void;
    setLoading: (loading: boolean) => void;
    setStreaming: (isStreaming: boolean, streamId?: string) => void;
    clearMessages: () => void;
    abortCurrentStream: () => void;
}

export const useChatStore = create<ChatState>()(
    devtools(
        (set, get) => ({
            messages: [],
            currentThreadId: undefined,
            loading: false,
            isStreaming: false,
            currentStreamId: undefined,

            setMessages: (messages) => set({ messages }),

            addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

            updateMessage: (messageId, updates) =>
                set((state) => ({
                    messages: state.messages.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg)),
                })),

            removeMessage: (messageId) =>
                set((state) => ({
                    messages: state.messages.filter((msg) => msg.id !== messageId),
                })),

            setCurrentThreadId: (threadId) => set({ currentThreadId: threadId }),

            setLoading: (loading) => set({ loading }),

            setStreaming: (isStreaming, streamId) =>
                set({
                    isStreaming,
                    currentStreamId: isStreaming ? streamId : undefined,
                }),

            abortCurrentStream: () => {
                const { currentStreamId } = get();
                if (currentStreamId) {
                    const manager = getStreamingManager();
                    const success = manager.abortStream(currentStreamId);
                    if (success) {
                        set({ isStreaming: false, currentStreamId: undefined });
                    }
                    return success;
                }
                return false;
            },

            clearMessages: () => set({ messages: [] }),
        }),
        {
            name: 'chat-store',
        }
    )
);
