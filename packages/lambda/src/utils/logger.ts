export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

class Logger {
    private logLevel: LogLevel;

    constructor() {
        // Set log level from environment or default to INFO
        const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
        this.logLevel = envLogLevel ? (LogLevel[envLogLevel as keyof typeof LogLevel] ?? LogLevel.INFO) : LogLevel.INFO;
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.logLevel;
    }

    private formatMessage(level: string, message: string, meta?: unknown): string {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
    }

    debug(message: string, meta?: unknown): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(this.formatMessage('DEBUG', message, meta));
        }
    }

    info(message: string, meta?: unknown): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(this.formatMessage('INFO', message, meta));
        }
    }

    warn(message: string, meta?: unknown): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatMessage('WARN', message, meta));
        }
    }

    error(message: string, meta?: unknown): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(this.formatMessage('ERROR', message, meta));
        }
    }

    // Convenience method for request logging
    request(method: string, path: string, meta?: { body?: unknown; queryStringParameters?: unknown }): void {
        this.info(`${method} ${path}`, meta);
    }
}

// Export a singleton instance
export const logger = new Logger();
