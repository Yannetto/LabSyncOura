import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    )
  }

  return createBrowserClient(url, key, {
    cookies: {
      getAll() {
        // Get all cookies from document.cookie
        const cookies: { name: string; value: string }[] = []
        if (typeof document !== 'undefined') {
          document.cookie.split(';').forEach((cookie) => {
            const [name, ...rest] = cookie.trim().split('=')
            const value = rest.join('=')
            if (name && value) {
              cookies.push({ name, value })
            }
          })
        }
        return cookies
      },
      setAll(cookiesToSet) {
        // Set cookies using document.cookie
        if (typeof document !== 'undefined') {
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookieString = `${name}=${value}`
            
            if (options) {
              if (options.maxAge) {
                cookieString += `; Max-Age=${options.maxAge}`
              }
              if (options.domain) {
                cookieString += `; Domain=${options.domain}`
              }
              if (options.path) {
                cookieString += `; Path=${options.path}`
              }
              if (options.sameSite) {
                cookieString += `; SameSite=${options.sameSite}`
              }
              if (options.secure) {
                cookieString += `; Secure`
              }
              if (options.httpOnly) {
                // httpOnly cookies can't be set from client-side JavaScript
                // This will be handled by the server
              }
            }
            
            document.cookie = cookieString
          })
        }
      },
    },
  })
}
