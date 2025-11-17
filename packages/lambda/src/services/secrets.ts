import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from '../utils/logger';

export class SecretsService {
    private client: SecretsManagerClient;
    private cache: Map<string, unknown> = new Map();

    constructor() {
        this.client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    }

    async getSecret(secretArn: string): Promise<unknown> {
        if (this.cache.has(secretArn)) {
            return this.cache.get(secretArn);
        }

        try {
            const command = new GetSecretValueCommand({
                SecretId: secretArn,
            });

            const response = await this.client.send(command);

            if (response.SecretString) {
                const secret = JSON.parse(response.SecretString);
                this.cache.set(secretArn, secret);
                return secret;
            }

            throw new Error('Secret value is empty');
        } catch (error) {
            logger.error('Failed to get secret', { secretArn }, error as Error);
            throw error;
        }
    }

    async getApiKeys(): Promise<{
        OPENAI_API_KEY: string;
        JWT_SECRET: string;
        OPENAI_MODEL: string;
        OPENAI_MAX_TOKENS: string;
        OPENAI_TEMPERATURE: string;
    }> {
        const secretArn = process.env.API_KEYS_SECRET_ARN;
        if (!secretArn) {
            throw new Error('API_KEYS_SECRET_ARN environment variable not set');
        }

        return this.getSecret(secretArn) as Promise<{
            OPENAI_API_KEY: string;
            JWT_SECRET: string;
            OPENAI_MODEL: string;
            OPENAI_MAX_TOKENS: string;
            OPENAI_TEMPERATURE: string;
        }>;
    }
}
