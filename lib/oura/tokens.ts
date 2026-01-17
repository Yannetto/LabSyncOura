import { createServiceClient } from '@/lib/supabase/service'
import { refreshOuraToken } from './client'

export interface OuraTokens {
  access_token: string
  refresh_token: string
  expires_at: string | null
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = createServiceClient()
  
  const { data: tokens, error } = await supabase
    .from('oura_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !tokens) {
    return null
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at) : null
  const now = new Date()
  const buffer = 5 * 60 * 1000 // 5 minutes

  if (expiresAt && expiresAt.getTime() - now.getTime() < buffer) {
    // Token expired, refresh it
    try {
      const newTokens = await refreshOuraToken(tokens.refresh_token)
      
      const newExpiresAt = new Date(now.getTime() + newTokens.expires_in * 1000)
      
      await supabase
        .from('oura_tokens')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token, // Single-use: always update
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      return newTokens.access_token
    } catch (error) {
      console.error('Token refresh failed:', error)
      return null
    }
  }

  return tokens.access_token
}

export async function storeOuraTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const supabase = createServiceClient()
  
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  await supabase
    .from('oura_tokens')
    .upsert({
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
}
