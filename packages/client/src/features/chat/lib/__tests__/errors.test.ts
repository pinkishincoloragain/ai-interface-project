/**
 * Tests for enhanced error handling system
 */

import {
    ErrorType,
    createEnhancedError,
    classifyError,
    getUserFriendlyMessage,
    calculateRetryDelay,
    shouldRetry,
    DEFAULT_RETRY_CONFIG,
} from '../errors';

describe('Error Handling System', () => {
    describe('createEnhancedError', () => {
        it('should create an enhanced error with correct properties', () => {
            const error = createEnhancedError(ErrorType.NETWORK_ERROR, 'Network connection failed');

            expect(error.type).toBe(ErrorType.NETWORK_ERROR);
            expect(error.message).toBe('Network connection failed');
            expect(error.recoverable).toBe(true); // Network errors are recoverable by default
        });

        it('should allow custom recoverable flag', () => {
            const error = createEnhancedError(ErrorType.NETWORK_ERROR, 'Critical network error', {
                recoverable: false,
            });

            expect(error.recoverable).toBe(false);
        });

        it('should include cause and context when provided', () => {
            const cause = new Error('Original error');
            const context = { statusCode: 500 };

            const error = createEnhancedError(ErrorType.SERVER_ERROR, 'Server error occurred', { cause, context });

            expect(error.cause).toBe(cause);
            expect(error.context).toEqual(context);
        });
    });

    describe('classifyError', () => {
        it('should classify timeout errors', () => {
            const error = new Error('Request timeout after 30 seconds');
            expect(classifyError(error)).toBe(ErrorType.TIMEOUT_ERROR);
        });

        it('should classify network errors', () => {
            const error = new Error('Network request failed');
            expect(classifyError(error)).toBe(ErrorType.NETWORK_ERROR);
        });

        it('should classify parse errors', () => {
            const error = new Error('JSON parse error');
            expect(classifyError(error)).toBe(ErrorType.PARSE_ERROR);
        });

        it('should classify validation errors', () => {
            const error = new Error('Schema validation failed');
            expect(classifyError(error)).toBe(ErrorType.VALIDATION_ERROR);
        });

        it('should default to server error for unknown errors', () => {
            const error = new Error('Unknown error occurred');
            expect(classifyError(error)).toBe(ErrorType.SERVER_ERROR);
        });
    });

    describe('getUserFriendlyMessage', () => {
        it('should return appropriate message for network errors', () => {
            const error = createEnhancedError(ErrorType.NETWORK_ERROR, 'Network failed');
            const message = getUserFriendlyMessage(error);
            expect(message).toContain('네트워크 연결');
        });

        it('should return appropriate message for timeout errors', () => {
            const error = createEnhancedError(ErrorType.TIMEOUT_ERROR, 'Timeout');
            const message = getUserFriendlyMessage(error);
            expect(message).toContain('시간이 초과');
        });

        it('should return appropriate message for server errors', () => {
            const error = createEnhancedError(ErrorType.SERVER_ERROR, 'Server error');
            const message = getUserFriendlyMessage(error);
            expect(message).toContain('서버에서 오류');
        });
    });

    describe('calculateRetryDelay', () => {
        it('should calculate exponential backoff delays', () => {
            const config = {
                initialDelay: 1000,
                maxDelay: 10000,
                backoffMultiplier: 2,
                maxAttempts: 3,
                retryableErrors: [ErrorType.NETWORK_ERROR],
            };

            expect(calculateRetryDelay(1, config)).toBe(1000);
            expect(calculateRetryDelay(2, config)).toBe(2000);
            expect(calculateRetryDelay(3, config)).toBe(4000);
        });

        it('should cap delays at maxDelay', () => {
            const config = {
                initialDelay: 1000,
                maxDelay: 3000,
                backoffMultiplier: 2,
                maxAttempts: 5,
                retryableErrors: [ErrorType.NETWORK_ERROR],
            };

            expect(calculateRetryDelay(4, config)).toBe(3000); // Capped at maxDelay
        });
    });

    describe('shouldRetry', () => {
        it('should retry recoverable errors within attempt limit', () => {
            const error = createEnhancedError(ErrorType.NETWORK_ERROR, 'Network error');
            expect(shouldRetry(error, 1, DEFAULT_RETRY_CONFIG)).toBe(true);
            expect(shouldRetry(error, 2, DEFAULT_RETRY_CONFIG)).toBe(true);
            expect(shouldRetry(error, 3, DEFAULT_RETRY_CONFIG)).toBe(false); // Exceeds maxAttempts
        });

        it('should not retry non-recoverable errors', () => {
            const error = createEnhancedError(ErrorType.PARSE_ERROR, 'Parse error');
            expect(shouldRetry(error, 1, DEFAULT_RETRY_CONFIG)).toBe(false);
        });

        it('should not retry non-retryable error types', () => {
            const config = {
                ...DEFAULT_RETRY_CONFIG,
                retryableErrors: [ErrorType.TIMEOUT_ERROR], // Only timeout errors
            };

            const networkError = createEnhancedError(ErrorType.NETWORK_ERROR, 'Network error');
            expect(shouldRetry(networkError, 1, config)).toBe(false);
        });
    });
});
