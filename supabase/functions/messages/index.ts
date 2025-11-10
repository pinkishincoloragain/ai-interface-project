// @ts-nocheck

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// interface Message {
//     id?: string;
//     thread_id: string;
//     role: 'user' | 'assistant' | 'system';
//     content: string;
//     created_at?: string;
// }

interface CreateMessageRequest {
    thread_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

serve(
    async (req: {
        method: string;
        headers: { get: (arg0: string) => any };
        url: string | URL;
        json: () => CreateMessageRequest | PromiseLike<CreateMessageRequest>;
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

            const url = new URL(req.url);
            const pathParts = url.pathname.split('/').filter(Boolean);
            const threadId = pathParts[pathParts.length - 1];

            // GET /messages/:threadId - Get all messages for a thread
            if (req.method === 'GET' && threadId) {
                // First verify the thread belongs to the user
                const { data: thread, error: threadError } = await supabaseClient
                    .from('threads')
                    .select('id')
                    .eq('id', threadId)
                    .eq('user_id', user.id)
                    .single();

                if (threadError || !thread) {
                    return new Response(JSON.stringify({ error: 'Thread not found' }), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                const { data: messages, error: messagesError } = await supabaseClient
                    .from('messages')
                    .select('*')
                    .eq('thread_id', threadId)
                    .order('created_at', { ascending: true });

                if (messagesError) {
                    console.error('Database error:', messagesError);
                    return new Response(JSON.stringify({ error: 'Failed to fetch messages' }), {
                        status: 500,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                return new Response(JSON.stringify({ messages }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            // POST /messages - Create new message
            if (req.method === 'POST') {
                const body: CreateMessageRequest = await req.json();
                const { thread_id, role, content } = body;

                if (!thread_id || !role || !content) {
                    return new Response(
                        JSON.stringify({ error: 'Missing required fields: thread_id, role, content' }),
                        {
                            status: 400,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        }
                    );
                }

                // Verify the thread belongs to the user
                const { data: thread, error: threadError } = await supabaseClient
                    .from('threads')
                    .select('id')
                    .eq('id', thread_id)
                    .eq('user_id', user.id)
                    .single();

                if (threadError || !thread) {
                    return new Response(JSON.stringify({ error: 'Thread not found' }), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                const { data: message, error: messageError } = await supabaseClient
                    .from('messages')
                    .insert({
                        thread_id,
                        user_id: user.id,
                        role,
                        content,
                    })
                    .select()
                    .single();

                if (messageError) {
                    console.error('Database error:', messageError);
                    return new Response(JSON.stringify({ error: 'Failed to create message' }), {
                        status: 500,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // Update thread's updated_at timestamp
                await supabaseClient
                    .from('threads')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', thread_id);

                return new Response(JSON.stringify({ message }), {
                    status: 201,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        } catch (functionError) {
            console.error('Messages function error:', functionError);
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
