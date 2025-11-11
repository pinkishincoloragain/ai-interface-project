interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface MockStreamChunk {
    content: string;
    isDone: boolean;
}

export class FallbackService {
    async createMockChatCompletion(messages: ChatMessage[]): Promise<{ content: string }> {
        const lastMessage = messages[messages.length - 1];

        if (!lastMessage || lastMessage.role !== 'user') {
            return { content: 'I need a user message to respond to.' };
        }

        // Simple mock responses based on keywords
        const userInput = lastMessage.content.toLowerCase();

        let response = '';

        if (userInput.includes('hello') || userInput.includes('hi')) {
            response = 'Hello! This is a mock response since OpenAI API is not configured.';
        } else if (userInput.includes('help')) {
            response =
                "I would love to help, but I'm just a fallback service. Please configure your OpenAI API key for real AI responses.";
        } else if (userInput.includes('what') || userInput.includes('how') || userInput.includes('why')) {
            response =
                "That's a great question! Unfortunately, I can only provide mock responses until you set up your OpenAI API key.";
        } else {
            response =
                "I understand you're trying to communicate with me. This is a mock response because OpenAI API is not configured.";
        }

        return { content: response };
    }

    async *createMockStreamingCompletion(messages: ChatMessage[]): AsyncGenerator<MockStreamChunk> {
        const completion = await this.createMockChatCompletion(messages);
        const words = completion.content.split(' ');

        for (let i = 0; i < words.length; i++) {
            yield {
                content: words[i] + (i < words.length - 1 ? ' ' : ''),
                isDone: i === words.length - 1,
            };

            // Simulate streaming delay
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
}
