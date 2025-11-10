export interface User {
    id: string;
    email?: string;
    aud: string;
    role?: string;
    email_confirmed_at?: string;
    phone?: string;
    confirmation_sent_at?: string;
    confirmed_at?: string;
    last_sign_in_at?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    identities?: Identity[];
    created_at?: string;
    updated_at?: string;
}

export interface Session {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
    user: User;
}

export interface Identity {
    id: string;
    user_id: string;
    identity_data?: Record<string, unknown>;
    provider: string;
    last_sign_in_at?: string;
    created_at?: string;
    updated_at?: string;
}
