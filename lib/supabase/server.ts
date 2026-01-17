import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          try {
            // Get cookies fresh each time to avoid Promise issues
            const freshCookies = await cookies()
            if (freshCookies && typeof (freshCookies as any).getAll === 'function') {
              return (freshCookies as any).getAll()
            }
          } catch {
            // If it fails, return empty array
          }
          return []
        },
        async setAll(cookiesToSet) {
          try {
            // Get cookies fresh each time
            const freshCookies = await cookies()
            cookiesToSet.forEach(({ name, value, options }) => {
              if (freshCookies && typeof (freshCookies as any).set === 'function') {
                (freshCookies as any).set(name, value, options || {})
              }
            })
          } catch {
            // Ignore errors
          }
        },
      },
    }
  )
}