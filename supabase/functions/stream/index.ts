// @ts-nocheck

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4.28.4';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface StreamRequest {
    messages: ChatMessage[];
    threadId?: string;
    messageId?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
}

serve(
    async (req: {
        method: string;
        headers: { get: (arg0: string) => any };
        json: () => StreamRequest | PromiseLike<StreamRequest>;
    }) => {
        // Handle CORS preflight requests
        if (req.method === 'OPTIONS') {
            return new Response('ok', { headers: corsHeaders });
        }

        try {
            // Create Supabase client
            const supabaseClient = createClient(
                // @ts-expect-error - Deno global not available in types
                Deno.env.get('SUPABASE_URL') ?? '',
                // @ts-expect-error - Deno global not available in types
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                {
                    global: {
                        headers: { Authorization: req.headers.get('Authorization')! },
                    },
                }
            );

            // Verify user authentication
            const {
                data: { user },
            } = await supabaseClient.auth.getUser();

            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            // Initialize OpenAI client
            // @ts-expect-error - Deno global not available in types
            const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
            if (!openaiApiKey) {
                throw new Error('OPENAI_API_KEY is not set');
            }

            const openai = new OpenAI({
                apiKey: openaiApiKey,
            });

            if (req.method === 'POST') {
                const body: StreamRequest = await req.json();
                const {
                    messages,
                    threadId,
                    messageId,
                    model = 'gpt-4o-mini',
                    temperature = 0.7,
                    max_tokens = 1000,
                } = body;

                // Save user message to database if threadId is provided
                const currentThreadId = threadId;
                if (messages.length > 0 && currentThreadId) {
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage.role === 'user') {
                        try {
                            await supabaseClient
                                .from('messages')
                                .insert({
                                    thread_id: currentThreadId,
                                    user_id: user.id,
                                    role: lastMessage.role,
                                    content: lastMessage.content,
                                })
                                .select()
                                .single();
                        } catch {
                            // Error saving user message
                        }
                    }
                }

                // Create streaming chat completion
                const stream = await openai.chat.completions.create({
                    model,
                    messages,
                    temperature,
                    max_completion_tokens: max_tokens,
                    stream: true,
                });

                // Track assistant message content for database persistence
                let assistantContent = '';

                // Create a ReadableStream to handle the OpenAI stream
                const readableStream = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const chunk of stream) {
                                const delta = chunk.choices[0]?.delta;
                                if (delta?.content) {
                                    assistantContent += delta.content;
                                    const data = `data: ${JSON.stringify({
                                        type: 'content',
                                        content: delta.content,
                                        messageId: messageId,
                                        conversationId: currentThreadId,
                                        user_id: user.id,
                                    })}\n\n`;
                                    controller.enqueue(new TextEncoder().encode(data));
                                }

                                if (chunk.choices[0]?.finish_reason === 'stop') {
                                    // Save assistant message to database
                                    if (currentThreadId && assistantContent) {
                                        try {
                                            await supabaseClient
                                                .from('messages')
                                                .insert({
                                                    thread_id: currentThreadId,
                                                    user_id: user.id,
                                                    role: 'assistant',
                                                    content: assistantContent,
                                                })
                                                .select()
                                                .single();

                                            // Update thread's updated_at timestamp
                                            await supabaseClient
                                                .from('threads')
                                                .update({ updated_at: new Date().toISOString() })
                                                .eq('id', currentThreadId);
                                        } catch {
                                            // Error saving assistant message
                                        }
                                    }

                                    const data = `data: ${JSON.stringify({
                                        type: 'done',
                                        messageId: messageId,
                                        conversationId: currentThreadId,
                                        user_id: user.id,
                                    })}\n\n`;
                                    controller.enqueue(new TextEncoder().encode(data));
                                    break;
                                }
                            }
                        } catch (streamError) {
                            console.error('Streaming error:', streamError);
                            const errorData = `data: ${JSON.stringify({
                                type: 'error',
                                error: streamError instanceof Error ? streamError.message : 'Unknown streaming error',
                            })}\n\n`;
                            controller.enqueue(new TextEncoder().encode(errorData));
                        } finally {
                            controller.close();
                        }
                    },
                });

                return new Response(readableStream, {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        Connection: 'keep-alive',
                    },
                });
            }

            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        } catch (functionError) {
            console.error('Stream function error:', functionError);
            return new Response(
                JSON.stringify({
                    error: 'Internal server error',
                    message: functionError instanceof Error ? functionError.message : 'Unknown error',
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }
    }
);
