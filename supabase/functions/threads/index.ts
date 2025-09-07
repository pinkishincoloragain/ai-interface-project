import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Thread interface removed - not used in the current implementation

interface CreateThreadRequest {
    title: string;
}

interface UpdateThreadRequest {
    title: string;
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

        const url = new URL(req.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const threadId = pathParts[pathParts.length - 1];

        // GET /threads - List all threads for user
        if (req.method === 'GET' && !threadId) {
            const { data: threads, error } = await supabaseClient
                .from('threads')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Database error:', error);
                return new Response(JSON.stringify({ error: 'Failed to fetch threads' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ threads }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // GET /threads/:id - Get specific thread
        if (req.method === 'GET' && threadId) {
            // Check if this is a request for messages
            const isMessagesRequest = url.pathname.endsWith('/messages');

            if (isMessagesRequest) {
                // First verify the thread belongs to the user
                const { data: thread, error: threadError } = await supabaseClient
                    .from('threads')
                    .select('*')
                    .eq('id', threadId)
                    .eq('user_id', user.id)
                    .single();

                if (threadError || !thread) {
                    return new Response(JSON.stringify({ error: 'Thread not found' }), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // Get messages for the thread
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

                return new Response(
                    JSON.stringify({
                        thread: {
                            ...thread,
                            messages: messages || [],
                        },
                    }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    }
                );
            } else {
                // Regular thread request without messages
                const { data: thread, error } = await supabaseClient
                    .from('threads')
                    .select('*')
                    .eq('id', threadId)
                    .eq('user_id', user.id)
                    .single();

                if (error || !thread) {
                    return new Response(JSON.stringify({ error: 'Thread not found' }), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                return new Response(JSON.stringify({ thread }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // POST /threads - Create new thread
        if (req.method === 'POST') {
            const body: CreateThreadRequest = await req.json();
            const { title } = body;

            if (!title) {
                return new Response(JSON.stringify({ error: 'Title is required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            const { data: thread, error } = await supabaseClient
                .from('threads')
                .insert({
                    title,
                    user_id: user.id,
                })
                .select()
                .single();

            if (error) {
                console.error('Database error:', error);
                return new Response(JSON.stringify({ error: 'Failed to create thread' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ thread }), {
                status: 201,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // PUT /threads/:id - Update thread
        if (req.method === 'PUT' && threadId) {
            const body: UpdateThreadRequest = await req.json();
            const { title } = body;

            if (!title) {
                return new Response(JSON.stringify({ error: 'Title is required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            const { data: thread, error } = await supabaseClient
                .from('threads')
                .update({ title, updated_at: new Date().toISOString() })
                .eq('id', threadId)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error || !thread) {
                return new Response(JSON.stringify({ error: 'Failed to update thread' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ thread }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // DELETE /threads/:id - Delete thread
        if (req.method === 'DELETE' && threadId) {
            const { error } = await supabaseClient.from('threads').delete().eq('id', threadId).eq('user_id', user.id);

            if (error) {
                console.error('Database error:', error);
                return new Response(JSON.stringify({ error: 'Failed to delete thread' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Threads function error:', error);
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
