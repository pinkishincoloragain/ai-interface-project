/**
 * Schema validation for chat messages and SSE data
 * Provides runtime type safety using Zod
 */

import { z } from 'zod';

/**
 * Schema for SSE message data received from the server
 */
export const SSEMessageDataSchema = z.object({
    id: z.string().uuid('Message ID must be a valid UUID'),
    content: z.string(),
    role: z.literal('assistant'),
    conversationId: z.string().uuid('Conversation ID must be a valid UUID'),
    isDone: z.boolean(),
});

/**
 * Schema for chat message
 */
export const ChatMessageSchema = z.object({
    id: z.string().uuid('Message ID must be a valid UUID'),
    role: z.enum(['user', 'assistant', 'system'] as const),
    content: z.string().min(1, 'Message content cannot be empty'),
    createdAt: z.string().datetime('Invalid datetime format'),
    status: z.enum(['sending', 'success', 'error'] as const).optional(),
});

/**
 * Schema for raw SSE event data
 */
export const RawSSEEventSchema = z.object({
    event: z.string().optional(),
    id: z.string().optional(),
    retry: z.number().positive().optional(),
    data: z.string(),
});

/**
 * Type inference from schemas
 */
export type ValidatedSSEMessageData = z.infer<typeof SSEMessageDataSchema>;
export type ValidatedChatMessage = z.infer<typeof ChatMessageSchema>;
export type ValidatedRawSSEEvent = z.infer<typeof RawSSEEventSchema>;

/**
 * Validation result wrapper
 */
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        issues: Array<{
            path: (string | number)[];
            message: string;
            code: string;
        }>;
    };
}

/**
 * Validates SSE message data with detailed error reporting
 */
export function validateSSEMessageData(data: unknown): ValidationResult<ValidatedSSEMessageData> {
    try {
        const validated = SSEMessageDataSchema.parse(data);
        return {
            success: true,
            data: validated,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: {
                    message: 'SSE message data validation failed',
                    issues: error.issues.map((issue) => ({
                        path: issue.path as (string | number)[],
                        message: issue.message,
                        code: issue.code,
                    })),
                },
            };
        }

        return {
            success: false,
            error: {
                message: 'Unknown validation error',
                issues: [],
            },
        };
    }
}

/**
 * Validates chat message with detailed error reporting
 */
export function validateChatMessage(data: unknown): ValidationResult<ValidatedChatMessage> {
    try {
        const validated = ChatMessageSchema.parse(data);
        return {
            success: true,
            data: validated,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: {
                    message: 'Chat message validation failed',
                    issues: error.issues.map((issue) => ({
                        path: issue.path as (string | number)[],
                        message: issue.message,
                        code: issue.code,
                    })),
                },
            };
        }

        return {
            success: false,
            error: {
                message: 'Unknown validation error',
                issues: [],
            },
        };
    }
}

/**
 * Validates raw SSE event structure
 */
export function validateRawSSEEvent(data: unknown): ValidationResult<ValidatedRawSSEEvent> {
    try {
        const validated = RawSSEEventSchema.parse(data);
        return {
            success: true,
            data: validated,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: {
                    message: 'Raw SSE event validation failed',
                    issues: error.issues.map((issue) => ({
                        path: issue.path as (string | number)[],
                        message: issue.message,
                        code: issue.code,
                    })),
                },
            };
        }

        return {
            success: false,
            error: {
                message: 'Unknown validation error',
                issues: [],
            },
        };
    }
}

/**
 * Type guard for checking if data matches SSE message schema
 */
export function isValidSSEMessageData(data: unknown): data is ValidatedSSEMessageData {
    return validateSSEMessageData(data).success;
}

/**
 * Type guard for checking if data matches chat message schema
 */
export function isValidChatMessage(data: unknown): data is ValidatedChatMessage {
    return validateChatMessage(data).success;
}

/**
 * Creates a safe parser that returns null on validation failure
 */
export function createSafeParser<T>(validator: (data: unknown) => ValidationResult<T>) {
    return (data: unknown): T | null => {
        const result = validator(data);
        return result.success ? result.data! : null;
    };
}

/**
 * Safe parsers for common use cases
 */
export const safeParseSSEMessageData = createSafeParser(validateSSEMessageData);
export const safeParseChatMessage = createSafeParser(validateChatMessage);
export const safeParseRawSSEEvent = createSafeParser(validateRawSSEEvent);
