import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors when env vars are not available
let _supabase: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are not configured');
    }

    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
};

// For backwards compatibility - will throw at runtime if env vars missing
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    try {
      const client = getSupabase();
      const value = client[prop as keyof SupabaseClient];
      // Bind functions to the client to preserve 'this' context
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    } catch (error) {
      console.error('Supabase client error:', error);
      throw error;
    }
  }
});

// Database types based on existing schema
export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    plan: 'free' | 'pro' | 'enterprise';
    role: 'user' | 'admin' | 'master';
    phone: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    portfolio_url: string | null;
    resume_data: Record<string, unknown> | null;
    personal_details: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    is_verified: boolean;
    certifications: unknown[];
    global_notes: string | null;
    feature_access: {
        cover_letter_enabled: boolean;
        resume_tailor_enabled: boolean;
    };
    credits: number;
    // Custom fields for access management
    access_granted?: boolean;
    access_expiry?: string | null;
}

export interface AppSettings {
    id: string;
    key: string;
    value: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}
