import { DatabaseService } from './database';
import { AuthService } from './auth';
import { OpenAIService } from './openai';
import { FallbackService } from './fallback';
import { SecretsService } from './secrets';
import { logger } from '../utils/logger';

export let db: DatabaseService;
export let auth: AuthService;
export let openai: OpenAIService;
export let fallback: FallbackService;
export let secrets: SecretsService;

export async function initializeServices() {
    logger.info('Initializing services...');

    // Initialize secrets service first
    secrets = new SecretsService();

    // Initialize database
    db = new DatabaseService();

    // Initialize auth service
    auth = new AuthService();

    // Initialize OpenAI service
    openai = new OpenAIService();

    // Initialize fallback service
    fallback = new FallbackService();

    logger.info('Services initialized successfully');
}
