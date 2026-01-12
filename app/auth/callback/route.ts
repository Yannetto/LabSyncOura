import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/app'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${error}&message=${errorDescription || 'Authentication failed'}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=no_code&message=No authentication code provided', request.url)
    )
  }

  try {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('[AuthCallback] Error exchanging code:', exchangeError)
      return NextResponse.redirect(
        new URL(`/login?error=exchange_failed&message=${exchangeError.message}`, request.url)
      )
    }

    // Success - redirect to intended page
    return NextResponse.redirect(new URL(next, request.url))
  } catch (error: any) {
    console.error('[AuthCallback] Unexpected error:', error)
    return NextResponse.redirect(
      new URL('/login?error=unexpected&message=An unexpected error occurred', request.url)
    )
  }
}
