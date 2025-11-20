import OpenAI from 'openai';
import { secrets } from './index';
import { logger } from '../utils/logger';

export class OpenAIService {
    private client: OpenAI | null = null;
    private initialized = false;

    constructor() {
        this.initialize();
    }

    private async initialize() {
        try {
            const apiKeys = await secrets.getApiKeys();

            if (apiKeys.OPENAI_API_KEY) {
                this.client = new OpenAI({
                    apiKey: apiKeys.OPENAI_API_KEY,
                });
                this.initialized = true;
                logger.info('OpenAI service initialized successfully');
            }
        } catch {
            logger.info('OpenAI API key not available, using fallback service');
        }
    }

    isInitialized(): boolean {
        return this.initialized && this.client !== null;
    }

    async createChatCompletion(
        messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        model?: string
    ): Promise<{ content: string } | null> {
        if (!this.isInitialized() || !this.client) {
            throw new Error('OpenAI service not initialized');
        }

        try {
            const apiKeys = await secrets.getApiKeys();

            const completion = await this.client.chat.completions.create({
                model: model || apiKeys.OPENAI_MODEL || 'gpt-4o-mini',
                messages,
                max_tokens: parseInt(apiKeys.OPENAI_MAX_TOKENS || '1000'),
                temperature: parseFloat(apiKeys.OPENAI_TEMPERATURE || '0.7'),
            });

            const content = completion.choices[0]?.message?.content;
            return content ? { content } : null;
        } catch (error) {
            logger.error('OpenAI API error', error);
            throw new Error('OpenAI API request failed');
        }
    }

    async *createStreamingChatCompletion(
        messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        model?: string
    ): AsyncGenerator<OpenAI.Chat.Completions.ChatCompletionChunk> {
        if (!this.isInitialized() || !this.client) {
            throw new Error('OpenAI service not initialized');
        }

        try {
            const apiKeys = await secrets.getApiKeys();

            const stream = await this.client.chat.completions.create({
                model: model || apiKeys.OPENAI_MODEL || 'gpt-4o-mini',
                messages,
                max_tokens: parseInt(apiKeys.OPENAI_MAX_TOKENS || '1000'),
                temperature: parseFloat(apiKeys.OPENAI_TEMPERATURE || '0.7'),
                stream: true,
            });

            for await (const chunk of stream) {
                yield chunk;
            }
        } catch (error) {
            logger.error('OpenAI streaming API error', error);
            throw new Error('OpenAI streaming API request failed');
        }
    }

    async generateTitle(firstMessage: string): Promise<string> {
        if (!this.isInitialized() || !this.client) {
            // Fallback title generation
            const fallbackTitle = firstMessage.trim().substring(0, 47);
            return fallbackTitle.length < firstMessage.trim().length ? fallbackTitle + '...' : fallbackTitle;
        }

        try {
            const completion = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content:
                            'Generate a short, descriptive title (max 50 characters) for this conversation based on the first message. Return only the title, nothing else.',
                    },
                    {
                        role: 'user',
                        content: firstMessage,
                    },
                ],
                max_tokens: 20,
                temperature: 0.3,
            });

            const title = completion.choices[0]?.message?.content?.trim();
            return title || 'New Chat';
        } catch (error) {
            logger.error('Title generation error', error);
            // Fallback title generation
            const fallbackTitle = firstMessage.trim().substring(0, 47);
            return fallbackTitle.length < firstMessage.trim().length ? fallbackTitle + '...' : fallbackTitle;
        }
    }
}
