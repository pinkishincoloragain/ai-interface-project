import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Thread {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export interface ThreadState {
    threads: Thread[];
    selectedThreadId?: string;

    // Actions
    setThreads: (threads: Thread[]) => void;
    addThread: (thread: Thread) => void;
    updateThread: (threadId: string, updates: Partial<Thread>) => void;
    removeThread: (threadId: string) => void;
    setSelectedThreadId: (threadId?: string) => void;
    clearThreads: () => void;
}

export const useThreadStore = create<ThreadState>()(
    devtools(
        (set) => ({
            threads: [],
            selectedThreadId: undefined,

            setThreads: (threads) => set({ threads }),

            addThread: (thread) => set((state) => ({ threads: [thread, ...state.threads] })),

            updateThread: (threadId, updates) =>
                set((state) => ({
                    threads: state.threads.map((thread) =>
                        thread.id === threadId ? { ...thread, ...updates } : thread
                    ),
                })),

            removeThread: (threadId) =>
                set((state) => ({
                    threads: state.threads.filter((thread) => thread.id !== threadId),
                    selectedThreadId: state.selectedThreadId === threadId ? undefined : state.selectedThreadId,
                })),

            setSelectedThreadId: (threadId) => set({ selectedThreadId: threadId }),

            clearThreads: () => set({ threads: [], selectedThreadId: undefined }),
        }),
        {
            name: 'thread-store',
        }
    )
);
