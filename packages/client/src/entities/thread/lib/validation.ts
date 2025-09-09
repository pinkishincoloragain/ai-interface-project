import type { Thread } from '../model/types';
import { MessageValidator } from '../../message';

export class ThreadValidator {
    static isValidThread(thread: Thread): boolean {
        return (
            Boolean(thread.id) &&
            typeof thread.title === 'string' &&
            Array.isArray(thread.messages) &&
            thread.messages.every(MessageValidator.isValidMessage) &&
            Boolean(thread.createdAt) &&
            Boolean(thread.updatedAt)
        );
    }

    static isEmpty(thread: Thread): boolean {
        return thread.messages.length === 0;
    }

    static hasNewTitle(thread: Thread): boolean {
        return thread.title === 'New Chat';
    }

    static isRecovered(thread: Thread): boolean {
        return thread.title === 'Recovered Chat';
    }

    static getLastMessage(thread: Thread) {
        return thread.messages[thread.messages.length - 1];
    }

    static getFirstUserMessage(thread: Thread) {
        return thread.messages.find(MessageValidator.isUserMessage);
    }
}
