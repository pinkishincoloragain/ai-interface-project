/**
 * Tests for schema validation system
 */

import {
    validateSSEMessageData,
    validateChatMessage,
    validateRawSSEEvent,
    isValidSSEMessageData,
    isValidChatMessage,
    safeParseSSEMessageData,
    safeParseChatMessage,
} from '../schemas';

describe('Schema Validation System', () => {
    describe('validateSSEMessageData', () => {
        it('should validate correct SSE message data', () => {
            const validData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                content: 'Hello world',
                role: 'assistant' as const,
                conversationId: '123e4567-e89b-12d3-a456-426614174001',
                isDone: false,
            };

            const result = validateSSEMessageData(validData);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(validData);
        });

        it('should reject invalid UUID format', () => {
            const invalidData = {
                id: 'not-a-uuid',
                content: 'Hello world',
                role: 'assistant' as const,
                conversationId: '123e4567-e89b-12d3-a456-426614174001',
                isDone: false,
            };

            const result = validateSSEMessageData(invalidData);
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('validation failed');
        });

        it('should reject incorrect role', () => {
            const invalidData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                content: 'Hello world',
                role: 'user' as const, // Should be 'assistant'
                conversationId: '123e4567-e89b-12d3-a456-426614174001',
                isDone: false,
            };

            const result = validateSSEMessageData(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject missing required fields', () => {
            const invalidData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                content: 'Hello world',
                role: 'assistant' as const,
                // Missing conversationId and isDone
            };

            const result = validateSSEMessageData(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('validateChatMessage', () => {
        it('should validate correct chat message', () => {
            const validData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                role: 'user' as const,
                content: 'Hello world',
                createdAt: '2023-12-01T10:00:00.000Z',
                status: 'success' as const,
            };

            const result = validateChatMessage(validData);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(validData);
        });

        it('should validate message without status', () => {
            const validData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                role: 'assistant' as const,
                content: 'Hello world',
                createdAt: '2023-12-01T10:00:00.000Z',
            };

            const result = validateChatMessage(validData);
            expect(result.success).toBe(true);
        });

        it('should reject empty content', () => {
            const invalidData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                role: 'user' as const,
                content: '',
                createdAt: '2023-12-01T10:00:00.000Z',
            };

            const result = validateChatMessage(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject invalid role', () => {
            const invalidData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                role: 'invalid' as any,
                content: 'Hello world',
                createdAt: '2023-12-01T10:00:00.000Z',
            };

            const result = validateChatMessage(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject invalid datetime format', () => {
            const invalidData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                role: 'user' as const,
                content: 'Hello world',
                createdAt: 'not-a-date',
            };

            const result = validateChatMessage(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('validateRawSSEEvent', () => {
        it('should validate minimal SSE event with just data', () => {
            const validData = {
                data: 'Hello world',
            };

            const result = validateRawSSEEvent(validData);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(validData);
        });

        it('should validate full SSE event', () => {
            const validData = {
                event: 'message',
                id: 'event-123',
                retry: 5000,
                data: 'Hello world',
            };

            const result = validateRawSSEEvent(validData);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(validData);
        });

        it('should reject negative retry value', () => {
            const invalidData = {
                data: 'Hello world',
                retry: -1000,
            };

            const result = validateRawSSEEvent(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('Type guards', () => {
        it('isValidSSEMessageData should work correctly', () => {
            const validData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                content: 'Hello world',
                role: 'assistant' as const,
                conversationId: '123e4567-e89b-12d3-a456-426614174001',
                isDone: false,
            };

            expect(isValidSSEMessageData(validData)).toBe(true);
            expect(isValidSSEMessageData({ invalid: 'data' })).toBe(false);
        });

        it('isValidChatMessage should work correctly', () => {
            const validData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                role: 'user' as const,
                content: 'Hello world',
                createdAt: '2023-12-01T10:00:00.000Z',
            };

            expect(isValidChatMessage(validData)).toBe(true);
            expect(isValidChatMessage({ invalid: 'data' })).toBe(false);
        });
    });

    describe('Safe parsers', () => {
        it('should return parsed data on success', () => {
            const validData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                content: 'Hello world',
                role: 'assistant' as const,
                conversationId: '123e4567-e89b-12d3-a456-426614174001',
                isDone: false,
            };

            const result = safeParseSSEMessageData(validData);
            expect(result).toEqual(validData);
        });

        it('should return null on validation failure', () => {
            const invalidData = { invalid: 'data' };

            const result = safeParseSSEMessageData(invalidData);
            expect(result).toBeNull();
        });

        it('should work for chat messages', () => {
            const validData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                role: 'user' as const,
                content: 'Hello world',
                createdAt: '2023-12-01T10:00:00.000Z',
            };

            const result = safeParseChatMessage(validData);
            expect(result).toEqual(validData);

            const invalidResult = safeParseChatMessage({ invalid: 'data' });
            expect(invalidResult).toBeNull();
        });
    });
});
