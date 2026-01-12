import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { exchangeCodeForTokens } from '@/lib/oura/client'
import { storeOuraTokens } from '@/lib/oura/tokens'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle Oura OAuth errors
  if (errorParam) {
    console.error('[OuraCallback] Oura OAuth error:', { errorParam, errorDescription })
    
    let errorMessage = 'Failed to connect Oura account'
    if (errorParam === 'access_denied') {
      errorMessage = 'Connection was not approved. You can try again at any time.'
    } else if (errorParam === 'invalid_request') {
      errorMessage = 'Invalid OAuth request. Please check your Oura app configuration.'
    } else if (errorDescription) {
      errorMessage = errorDescription
    }
    
    return NextResponse.redirect(
      new URL(`/app?connected=0&error=${errorParam}&message=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }

  if (!code || !state) {
    console.error('[OuraCallback] Missing code or state:', { hasCode: !!code, hasState: !!state })
    return NextResponse.redirect(new URL('/app?connected=0&error=invalid_request&message=Missing authorization code or state', request.url))
  }

  // Validate state
  const cookieStore = await cookies()
  const stateCookie = cookieStore.get('oura_oauth_state')
  const storedStateWithUserId = stateCookie?.value

  if (!storedStateWithUserId) {
    return NextResponse.redirect(new URL('/app?connected=0&error=invalid_state', request.url))
  }

  // Extract state from stored value (format: "state:userId")
  const storedState = storedStateWithUserId.split(':')[0]
  if (storedState !== state) {
    return NextResponse.redirect(new URL('/app?connected=0&error=invalid_state', request.url))
  }

  // Clear state cookie
  cookieStore.set('oura_oauth_state', '', { maxAge: 0, path: '/' })

  try {
    // Use request origin for redirect URI to match what was sent in the OAuth request
    const baseUrl = process.env.BASE_URL || request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/oura/callback`

    console.log('[OuraCallback] Exchanging code for tokens:', { 
      redirectUri, 
      baseUrl,
      hasCode: !!code,
      hasState: !!state 
    })

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri)

    // Store tokens
    await storeOuraTokens(
      user.id,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in
    )

    // Ensure profile exists
    const serviceSupabase = createServiceClient()
    await serviceSupabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email!,
      }, {
        onConflict: 'id',
      })

    return NextResponse.redirect(new URL('/app?connected=1', request.url))
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL('/app?connected=0&error=token_exchange_failed', request.url))
  }
}
