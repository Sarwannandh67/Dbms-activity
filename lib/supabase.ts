import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Use getSupabase() in server-side API routes (lazy, avoids build-time init)
export function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  return createClient(url, key)
}

// Use getClientSupabase() in client components ('use client')
let _clientSupabase: SupabaseClient | null = null
export function getClientSupabase(): SupabaseClient {
  if (!_clientSupabase) {
    _clientSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  }
  return _clientSupabase
}
