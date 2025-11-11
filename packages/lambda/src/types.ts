import { Context } from 'aws-lambda';

export interface LambdaRequest {
    method: string;
    path: string;
    headers: Record<string, string | undefined>;
    body: unknown;
    queryStringParameters: Record<string, string | undefined>;
    context: Context;
    params?: Record<string, string>;
}

export interface LambdaResponse {
    statusCode: number;
    headers?: Record<string, string>;
    body: unknown;
}

export type RouteHandler = (req: LambdaRequest) => Promise<LambdaResponse>;

export interface Router {
    register(method: string, path: string, handler: RouteHandler): void;
}

export interface AuthRequest extends LambdaRequest {
    body: {
        email?: string;
        password?: string;
        token?: string;
        refresh_token?: string;
    };
}

export interface ChatRequest extends LambdaRequest {
    body: {
        message?: string;
        threadId?: string;
        conversationId?: string;
        stream?: boolean;
        messages?: ChatMessage[];
    };
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ErrorWithMessage {
    message: string;
}
