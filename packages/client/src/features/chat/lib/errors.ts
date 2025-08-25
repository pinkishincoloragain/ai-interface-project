/**
 * Enhanced Error Handling System for SSE Streaming
 * Provides structured error types, recovery strategies, and retry mechanisms
 */

/**
 * Classification of different error types that can occur during SSE streaming
 */
export enum ErrorType {
    /** Network connectivity issues */
    NETWORK_ERROR = 'network_error',
    /** JSON parsing failures */
    PARSE_ERROR = 'parse_error',
    /** Request timeout */
    TIMEOUT_ERROR = 'timeout_error',
    /** Schema validation failures */
    VALIDATION_ERROR = 'validation_error',
    /** Server-side errors */
    SERVER_ERROR = 'server_error',
    /** User aborted the request */
    ABORT_ERROR = 'abort_error',
}

/**
 * Structured error interface with recovery information
 */
export interface EnhancedError extends Error {
    /** Error type for classification */
    type: ErrorType;
    /** Original error message */
    message: string;
    /** Whether this error can be recovered from */
    recoverable: boolean;
    /** Suggested retry delay in milliseconds */
    retryAfter?: number;
    /** Original error that caused this enhanced error */
    cause?: Error;
    /** Additional context data */
    context?: Record<string, unknown>;
}

/**
 * Retry configuration for different error types
 */
export interface RetryConfig {
    /** Maximum number of retry attempts */
    maxAttempts: number;
    /** Initial delay between retries (ms) */
    initialDelay: number;
    /** Maximum delay between retries (ms) */
    maxDelay: number;
    /** Exponential backoff multiplier */
    backoffMultiplier: number;
    /** Error types that should trigger retries */
    retryableErrors: ErrorType[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR, ErrorType.SERVER_ERROR],
};

/**
 * Creates an enhanced error with proper classification and recovery info
 */
export function createEnhancedError(
    type: ErrorType,
    message: string,
    options: {
        cause?: Error;
        recoverable?: boolean;
        retryAfter?: number;
        context?: Record<string, unknown>;
    } = {}
): EnhancedError {
    const error = new Error(message) as EnhancedError;
    error.type = type;
    error.recoverable = options.recoverable ?? isRecoverable(type);
    error.retryAfter = options.retryAfter;
    error.cause = options.cause;
    error.context = options.context;

    return error;
}

/**
 * Determines if an error type is recoverable by default
 */
function isRecoverable(type: ErrorType): boolean {
    switch (type) {
        case ErrorType.NETWORK_ERROR:
        case ErrorType.TIMEOUT_ERROR:
        case ErrorType.SERVER_ERROR:
            return true;
        case ErrorType.PARSE_ERROR:
        case ErrorType.VALIDATION_ERROR:
        case ErrorType.ABORT_ERROR:
            return false;
        default:
            return false;
    }
}

/**
 * Classifies a generic error into a specific ErrorType
 */
export function classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
        return ErrorType.TIMEOUT_ERROR;
    }

    if (message.includes('network') || message.includes('fetch')) {
        return ErrorType.NETWORK_ERROR;
    }

    if (message.includes('json') || message.includes('parse')) {
        return ErrorType.PARSE_ERROR;
    }

    if (message.includes('abort')) {
        return ErrorType.ABORT_ERROR;
    }

    if (message.includes('validation') || message.includes('schema')) {
        return ErrorType.VALIDATION_ERROR;
    }

    // Default to server error for unknown errors
    return ErrorType.SERVER_ERROR;
}

/**
 * Generates user-friendly error messages
 */
export function getUserFriendlyMessage(error: EnhancedError): string {
    switch (error.type) {
        case ErrorType.NETWORK_ERROR:
            return '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.';
        case ErrorType.TIMEOUT_ERROR:
            return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
        case ErrorType.PARSE_ERROR:
            return '서버 응답을 처리하는 중 오류가 발생했습니다.';
        case ErrorType.VALIDATION_ERROR:
            return '응답 데이터 형식이 올바르지 않습니다.';
        case ErrorType.SERVER_ERROR:
            return '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        case ErrorType.ABORT_ERROR:
            return '요청이 취소되었습니다.';
        default:
            return '알 수 없는 오류가 발생했습니다.';
    }
}

/**
 * Calculates retry delay using exponential backoff
 */
export function calculateRetryDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
    const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelay);
}

/**
 * Determines if an error should trigger a retry
 */
export function shouldRetry(
    error: EnhancedError,
    attempt: number,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
    return attempt < config.maxAttempts && error.recoverable && config.retryableErrors.includes(error.type);
}
