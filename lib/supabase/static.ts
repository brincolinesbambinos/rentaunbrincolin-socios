import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// This client is specifically for use in generateStaticParams or build-time fetching
// where cookies() are not available.
export function createStaticClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
