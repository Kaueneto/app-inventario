import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseServerClient(accessToken?: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('variaveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY sao obrigatorias');
  }

  const authorizationHeader = accessToken
    ? ({ Authorization: `Bearer ${accessToken}` } as Record<string, string>)
    : undefined;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authorizationHeader,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
