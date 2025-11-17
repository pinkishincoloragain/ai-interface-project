export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

interface LogContext {
    requestId?: string;
    userId?: string;
    correlationId?: string;
    functionName?: string;
    functionVersion?: string;
    memoryUsed?: number;
    duration?: number;
    [key: string]: unknown;
}

interface StructuredLogEntry {
    timestamp: string;
    level: string;
    message: string;
    context?: LogContext;
    meta?: unknown;
    error?: {
        name: string;
        message: string;
        stack?: string;
        code?: string;
    };
}

class Logger {
    private logLevel: LogLevel;
    private context: LogContext = {};

    constructor() {
        // Set log level from environment or default to INFO
        const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
        this.logLevel = envLogLevel ? (LogLevel[envLogLevel as keyof typeof LogLevel] ?? LogLevel.INFO) : LogLevel.INFO;

        // Initialize with Lambda context if available
        this.context.functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
        this.context.functionVersion = process.env.AWS_LAMBDA_FUNCTION_VERSION;
    }

    setContext(context: Partial<LogContext>): void {
        this.context = { ...this.context, ...context };
    }

    setRequestId(requestId: string): void {
        this.context.requestId = requestId;
    }

    setCorrelationId(correlationId: string): void {
        this.context.correlationId = correlationId;
    }

    setUserId(userId: string): void {
        this.context.userId = userId;
    }

    clearContext(): void {
        const persistentKeys = ['functionName', 'functionVersion'];
        const persistentContext: LogContext = {};
        persistentKeys.forEach((key) => {
            if (this.context[key]) {
                persistentContext[key] = this.context[key];
            }
        });
        this.context = persistentContext;
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.logLevel;
    }

    private createLogEntry(level: string, message: string, meta?: unknown, error?: Error): StructuredLogEntry {
        const entry: StructuredLogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: { ...this.context },
        };

        if (meta) {
            entry.meta = meta;
        }

        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: (error as any).code,
            };
        }

        return entry;
    }

    private outputLog(entry: StructuredLogEntry): void {
        // Use JSON format for CloudWatch structured logging
        const logString = JSON.stringify(entry);

        switch (entry.level) {
            case 'DEBUG':
                console.debug(logString);
                break;
            case 'INFO':
                console.info(logString);
                break;
            case 'WARN':
                console.warn(logString);
                break;
            case 'ERROR':
                console.error(logString);
                break;
            default:
                console.log(logString);
        }
    }

    debug(message: string, meta?: unknown): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            const entry = this.createLogEntry('DEBUG', message, meta);
            this.outputLog(entry);
        }
    }

    info(message: string, meta?: unknown): void {
        if (this.shouldLog(LogLevel.INFO)) {
            const entry = this.createLogEntry('INFO', message, meta);
            this.outputLog(entry);
        }
    }

    warn(message: string, meta?: unknown): void {
        if (this.shouldLog(LogLevel.WARN)) {
            const entry = this.createLogEntry('WARN', message, meta);
            this.outputLog(entry);
        }
    }

    error(message: string, meta?: unknown, error?: Error): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            const entry = this.createLogEntry('ERROR', message, meta, error);
            this.outputLog(entry);
        }
    }

    // Convenience methods for common logging patterns
    request(
        method: string,
        path: string,
        meta?: { body?: unknown; queryStringParameters?: unknown; userAgent?: string; sourceIp?: string }
    ): void {
        this.info(`Request: ${method} ${path}`, meta);
    }

    response(statusCode: number, duration?: number, meta?: Record<string, unknown>): void {
        const logMeta = { statusCode, duration, ...(meta || {}) };

        if (statusCode >= 500) {
            this.error('Response sent', logMeta);
        } else if (statusCode >= 400) {
            this.warn('Response sent', logMeta);
        } else {
            this.info('Response sent', logMeta);
        }
    }

    performance(operation: string, duration: number, meta?: Record<string, unknown>): void {
        this.info(`Performance: ${operation}`, { duration, ...(meta || {}) });
    }

    security(event: string, meta?: unknown): void {
        this.warn(`Security: ${event}`, meta);
    }

    business(event: string, meta?: unknown): void {
        this.info(`Business: ${event}`, meta);
    }
}

// Export a singleton instance
export const logger = new Logger();
