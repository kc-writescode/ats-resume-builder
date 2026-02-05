import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  checks.env_url = supabaseUrl
    ? { status: 'ok', message: `URL configured (${supabaseUrl.substring(0, 30)}...)` }
    : { status: 'error', message: 'NEXT_PUBLIC_SUPABASE_URL is missing' };

  checks.env_key = supabaseAnonKey
    ? { status: 'ok', message: `Key configured (${supabaseAnonKey.substring(0, 10)}...)` }
    : { status: 'error', message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing' };

  // Try to initialize Supabase client
  try {
    const client = getSupabase();
    checks.client_init = { status: 'ok', message: 'Client initialized successfully' };

    // Try a simple database query
    try {
      const { error } = await client.from('profiles').select('count').limit(1);
      if (error) {
        checks.db_connection = { status: 'error', message: `DB query failed: ${error.message}` };
      } else {
        checks.db_connection = { status: 'ok', message: 'Database connection successful' };
      }
    } catch (dbError) {
      checks.db_connection = {
        status: 'error',
        message: `DB error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
      };
    }

    // Try auth service
    try {
      const { error } = await client.auth.getSession();
      if (error) {
        checks.auth_service = { status: 'error', message: `Auth error: ${error.message}` };
      } else {
        checks.auth_service = { status: 'ok', message: 'Auth service accessible' };
      }
    } catch (authError) {
      checks.auth_service = {
        status: 'error',
        message: `Auth error: ${authError instanceof Error ? authError.message : 'Unknown error'}`
      };
    }
  } catch (initError) {
    checks.client_init = {
      status: 'error',
      message: `Client init failed: ${initError instanceof Error ? initError.message : 'Unknown error'}`
    };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks
    },
    { status: allOk ? 200 : 503 }
  );
}
