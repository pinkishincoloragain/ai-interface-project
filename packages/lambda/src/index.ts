import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { router } from './router';
import { initializeServices } from './services';

// Global service initialization
let servicesInitialized = false;

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    // Initialize services on cold start
    if (!servicesInitialized) {
        await initializeServices();
        servicesInitialized = true;
    }

    try {
        // Parse the request
        const method = event.httpMethod;
        const { path } = event;
        const headers = event.headers || {};
        const body = event.body ? JSON.parse(event.body) : null;
        const queryStringParameters = event.queryStringParameters || {};

        console.log(`${method} ${path}`, { body, queryStringParameters });

        // Route the request
        const response = await router.handle({
            method,
            path,
            headers,
            body,
            queryStringParameters,
            context,
        });

        return {
            statusCode: response.statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                ...response.headers,
            },
            body: JSON.stringify(response.body),
        };
    } catch (error) {
        console.error('Lambda handler error:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
