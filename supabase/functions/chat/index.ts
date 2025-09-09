import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-expect-error - Deno module type declarations not available
import OpenAI from 'https://deno.land/x/openai@v4.52.7/mod.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ChatRequest {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
}

serve(async (req) => {
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
            const body: ChatRequest = await req.json();
            const { messages, model = 'gpt-4o-mini', temperature = 0.7, max_tokens = 1000 } = body;

            // Create chat completion
            const completion = await openai.chat.completions.create({
                model,
                messages,
                temperature,
                max_completion_tokens: max_tokens,
            });

            const response = {
                message: completion.choices[0]?.message,
                usage: completion.usage,
                user_id: user.id,
            };

            return new Response(JSON.stringify(response), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Handle GET request for health check
        if (req.method === 'GET') {
            return new Response(
                JSON.stringify({
                    status: 'healthy',
                    service: 'chat',
                    user_id: user.id,
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Chat function error:', error);
        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                message: error.message,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
