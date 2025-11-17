import { authRoutes } from './routes/auth';
import { chatRoutes } from './routes/chat';
import { streamRoutes } from './routes/stream';
import { logger } from './utils/logger';
import type { LambdaRequest, LambdaResponse, RouteHandler } from './types';

class Router {
    private routes: Record<string, Record<string, RouteHandler>> = {};

    register(method: string, path: string, handler: RouteHandler) {
        if (!this.routes[method]) {
            this.routes[method] = {};
        }
        this.routes[method][path] = handler;
        logger.debug('Route registered', { method, path });
    }

    async handle(req: LambdaRequest): Promise<LambdaResponse> {
        logger.debug('Routing request', {
            method: req.method,
            path: req.path,
            availableRoutes: Object.keys(this.routes[req.method] || {}),
        });

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            logger.debug('Handling CORS preflight request');
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                },
                body: '',
            };
        }

        // Try exact path match first
        const methodRoutes = this.routes[req.method];
        if (methodRoutes && methodRoutes[req.path]) {
            logger.debug('Route matched exactly', { pattern: req.path });
            return methodRoutes[req.path](req);
        }

        // Try pattern matching for dynamic routes
        if (methodRoutes) {
            for (const [pattern, handler] of Object.entries(methodRoutes)) {
                if (this.matchPattern(pattern, req.path)) {
                    logger.debug('Route matched by pattern', { pattern, path: req.path });
                    // Add path parameters to request
                    const params = this.extractParams(pattern, req.path);
                    req.params = params;
                    return handler(req);
                }
            }
        }

        // 404 Not Found
        logger.warn('No route found', {
            method: req.method,
            path: req.path,
            availableRoutes: Object.keys(this.routes[req.method] || {}),
        });
        return {
            statusCode: 404,
            body: { error: 'Not Found' },
        };
    }

    private matchPattern(pattern: string, path: string): boolean {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');

        if (patternParts.length !== pathParts.length) {
            return false;
        }

        return patternParts.every((part, index) => part.startsWith(':') || part === pathParts[index]);
    }

    private extractParams(pattern: string, path: string): Record<string, string> {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');
        const params: Record<string, string> = {};

        patternParts.forEach((part, index) => {
            if (part.startsWith(':')) {
                const paramName = part.slice(1);
                params[paramName] = pathParts[index];
            }
        });

        return params;
    }
}

export const router = new Router();

// Register routes
authRoutes(router);
chatRoutes(router);
streamRoutes(router);
