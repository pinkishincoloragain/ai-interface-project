import type { ChatMessage } from '../../message';

export interface Thread {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}

export interface ThreadCreateParams {
    title?: string;
    messages?: ChatMessage[];
}

export interface ThreadUpdateParams {
    title?: string;
}
