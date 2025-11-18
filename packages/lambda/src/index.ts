import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { router } from './router';
import { initializeServices } from './services';
import { logger } from './utils/logger';

// Export streaming handler for /api/chat/stream endpoint
export { streamingHandler } from './streaming-handler';

// Global service initialization
let servicesInitialized = false;

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const startTime = Date.now();

    // Generate correlation ID for request tracking
    const correlationId = randomUUID();
    const requestId = context.awsRequestId;

    // Set up logger context
    logger.setRequestId(requestId);
    logger.setCorrelationId(correlationId);

    // Initialize services on cold start
    if (!servicesInitialized) {
        logger.info('Initializing services on cold start');
        const initStart = Date.now();
        await initializeServices();
        servicesInitialized = true;
        logger.performance('Service initialization', Date.now() - initStart);
    }

    try {
        // Parse the request
        const method = event.httpMethod;
        const { path } = event;
        // Normalize headers to lowercase for consistent access
        const headers = Object.keys(event.headers || {}).reduce(
            (acc, key) => {
                acc[key.toLowerCase()] = event.headers[key];
                return acc;
            },
            {} as Record<string, string | undefined>
        );
        let body = null;
        if (event.body) {
            try {
                // Handle base64 encoded body
                const bodyString = event.isBase64Encoded
                    ? Buffer.from(event.body, 'base64').toString('utf-8')
                    : event.body;

                body = JSON.parse(bodyString);
            } catch (parseError) {
                logger.error(
                    'JSON parsing error',
                    {
                        body: event.body?.substring(0, 100), // Log first 100 chars
                        isBase64Encoded: event.isBase64Encoded,
                    },
                    parseError as Error
                );

                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({
                        error: 'Invalid JSON in request body',
                        message: 'The request body contains malformed JSON',
                        correlationId,
                    }),
                };
            }
        }
        const queryStringParameters = event.queryStringParameters || {};

        // Extract user information from auth headers if available
        const authHeader = headers.authorization;
        if (authHeader) {
            try {
                // Basic JWT decode to get user ID (without verification for logging)
                const token = authHeader.replace('Bearer ', '');
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                if (payload.sub) {
                    logger.setUserId(payload.sub);
                }
            } catch {
                // Ignore JWT parsing errors for logging
            }
        }

        logger.request(method, path, {
            body: body ? '[REDACTED]' : null, // Don't log sensitive body content
            queryStringParameters,
            userAgent: headers['user-agent'] || headers['User-Agent'],
            sourceIp: event.requestContext?.identity?.sourceIp,
        });

        // Route the request
        const routeStart = Date.now();
        const response = await router.handle({
            method,
            path,
            headers,
            body,
            queryStringParameters,
            context,
        });
        const routeDuration = Date.now() - routeStart;

        const totalDuration = Date.now() - startTime;
        logger.response(response.statusCode, totalDuration, { routeDuration });

        // Determine if response body is already a string (e.g., SSE format)
        const isSSE = response.headers?.['Content-Type'] === 'text/event-stream';
        const responseBody = isSSE ? response.body : JSON.stringify(response.body);

        return {
            statusCode: response.statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'X-Correlation-ID': correlationId,
                ...response.headers,
            },
            body: responseBody,
        };
    } catch (error) {
        const totalDuration = Date.now() - startTime;
        logger.error('Lambda handler error', { duration: totalDuration }, error as Error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'X-Correlation-ID': correlationId,
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
                correlationId,
            }),
        };
    } finally {
        // Clear context for next request (in case of container reuse)
        logger.clearContext();
    }
};
