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

  // Handle access denied
  if (errorParam === 'access_denied') {
    return NextResponse.redirect(new URL('/app?connected=0&error=access_denied', request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/app?connected=0&error=invalid_request', request.url))
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
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/oura/callback`

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
