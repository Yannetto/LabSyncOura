'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient()
        
        // Check for query parameters (PKCE flow)
        const code = searchParams.get('code')
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        const next = searchParams.get('next') || '/app'

        // Handle errors from query params
        if (errorParam) {
          console.error('[AuthCallback] Error from Supabase:', errorParam, errorDescription)
          router.push(`/login?error=${errorParam}&message=${errorDescription || 'Authentication failed'}`)
          return
        }

        // Handle PKCE flow (OAuth with code parameter)
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('[AuthCallback] Error exchanging code:', exchangeError)
            router.push(`/login?error=exchange_failed&message=${exchangeError.message}`)
            return
          }

          // Success - redirect to intended page
          router.push(next)
          return
        }

        // Handle magic link flow (hash fragments)
        // Get the hash fragment from the URL (Supabase magic links use hash fragments)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const hashError = hashParams.get('error')
        const hashErrorDescription = hashParams.get('error_description')
        const type = hashParams.get('type')

        // Handle errors from hash
        if (hashError) {
          console.error('[AuthCallback] Error from hash:', hashError, hashErrorDescription)
          router.push(`/login?error=${hashError}&message=${hashErrorDescription || 'Authentication failed'}`)
          return
        }

        // For magic links, Supabase sets the session automatically via cookies
        // We just need to verify the user is authenticated
        if (type === 'magiclink' || accessToken) {
          // Wait a moment for Supabase to set the session cookie
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          
          if (userError || !user) {
            console.error('[AuthCallback] User not authenticated:', userError)
            router.push('/login?error=not_authenticated&message=Authentication failed. Please try again.')
            return
          }

          // Success - redirect to intended page
          router.push(next)
        } else {
          // No token or type - redirect to login
          router.push('/login?error=invalid_request&message=Invalid authentication request')
        }
      } catch (err: any) {
        console.error('[AuthCallback] Unexpected error:', err)
        setError(err.message || 'An unexpected error occurred')
        router.push('/login?error=unexpected&message=An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing sign in...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Return to login
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
