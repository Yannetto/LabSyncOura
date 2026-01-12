import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Generate OAuth state
  const state = randomBytes(32).toString('hex')
  const stateWithUserId = `${state}:${user.id}`

  // Store state in httpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set('oura_oauth_state', stateWithUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  // Build OAuth URL
  const clientId = process.env.OURA_CLIENT_ID!
  
  // Use request origin for redirect URI to ensure it matches exactly
  // Fallback to BASE_URL or construct from request
  const baseUrl = process.env.BASE_URL || request.nextUrl.origin
  const redirectUri = `${baseUrl}/api/oura/callback`

  // Validate client ID
  if (!clientId) {
    console.error('[OuraStart] Missing OURA_CLIENT_ID')
    return NextResponse.redirect(new URL('/app?connected=0&error=configuration_error', request.url))
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'daily spo2Daily', // Include spo2Daily scope for SpO2 data
    state: state,
  })

  const oauthUrl = `https://cloud.ouraring.com/oauth/authorize?${params.toString()}`
  
  console.log('[OuraStart] Redirecting to Oura OAuth:', { 
    redirectUri, 
    baseUrl,
    hasClientId: !!clientId 
  })

  return NextResponse.redirect(oauthUrl)
}
