import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatMessage } from '@/entities/message';

export interface ChatState {
    messages: ChatMessage[];
    currentThreadId?: string;
    loading: boolean;
    messagesInitialized: boolean; // Track if messages have been loaded from server

    // Actions
    setMessages: (messages: ChatMessage[]) => void;
    addMessage: (message: ChatMessage) => void;
    updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
    removeMessage: (messageId: string) => void;
    setCurrentThreadId: (threadId?: string) => void;
    setLoading: (loading: boolean) => void;
    clearMessages: () => void;
    setMessagesInitialized: (initialized: boolean) => void;
    addOrUpdateMessage: (message: ChatMessage) => void;
}

export const useChatStore = create<ChatState>()(
    devtools(
        (set) => ({
            messages: [],
            currentThreadId: undefined,
            loading: false,
            messagesInitialized: false,

            setMessages: (messages) => set({ messages, messagesInitialized: true }),

            addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

            updateMessage: (messageId, updates) =>
                set((state) => {
                    // Only update if the message actually changed
                    const messageIndex = state.messages.findIndex((msg) => msg.id === messageId);
                    if (messageIndex === -1) return state;

                    const existingMessage = state.messages[messageIndex];
                    const newMessage = { ...existingMessage, ...updates };

                    // Check if anything actually changed
                    if (JSON.stringify(existingMessage) === JSON.stringify(newMessage)) {
                        return state;
                    }

                    // Create new array only if needed
                    const newMessages = [...state.messages];
                    newMessages[messageIndex] = newMessage;

                    return { messages: newMessages };
                }),

            removeMessage: (messageId) =>
                set((state) => ({
                    messages: state.messages.filter((msg) => msg.id !== messageId),
                })),

            setCurrentThreadId: (threadId) => set({ currentThreadId: threadId }),

            setLoading: (loading) => set({ loading }),

            clearMessages: () => set({ messages: [], messagesInitialized: false }),

            // Optimized message operations to prevent unnecessary re-renders
            addOrUpdateMessage: (message: ChatMessage) =>
                set((state) => {
                    const existingIndex = state.messages.findIndex((msg) => msg.id === message.id);
                    if (existingIndex >= 0) {
                        // Update existing message
                        const newMessages = [...state.messages];
                        newMessages[existingIndex] = message;
                        return { messages: newMessages };
                    } else {
                        // Add new message
                        return { messages: [...state.messages, message] };
                    }
                }),

            setMessagesInitialized: (initialized) => set({ messagesInitialized: initialized }),
        }),
        {
            name: 'chat-store',
        }
    )
);
