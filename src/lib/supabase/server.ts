import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Cliente server-side com service role (para APIs)
export function createServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
