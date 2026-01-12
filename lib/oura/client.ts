const OURA_API_BASE = 'https://api.ouraring.com'

export interface OuraTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<OuraTokenResponse> {
  const clientId = process.env.OURA_CLIENT_ID!
  const clientSecret = process.env.OURA_CLIENT_SECRET!

  const response = await fetch('https://api.ouraring.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Oura token exchange failed: ${error}`)
  }

  return response.json()
}

export async function refreshOuraToken(
  refreshToken: string
): Promise<OuraTokenResponse> {
  const clientId = process.env.OURA_CLIENT_ID!
  const clientSecret = process.env.OURA_CLIENT_SECRET!

  const response = await fetch('https://api.ouraring.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Oura token refresh failed: ${error}`)
  }

  return response.json()
}

export interface OuraDailyData {
  [key: string]: any
}

export async function fetchOuraDailyData(
  accessToken: string,
  collection: string,
  startDate: string,
  endDate: string
): Promise<OuraDailyData[]> {
  const url = `${OURA_API_BASE}/v2/usercollection/${collection}?start_date=${startDate}&end_date=${endDate}`
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Oura API error: ${error}`)
  }

  const data = await response.json()
  return data.data || []
}

/**
 * Fetch sleep records from /v2/usercollection/sleep endpoint
 * This provides actual sleep durations in seconds (not daily summaries)
 */
export async function fetchSleepData(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<OuraDailyData[]> {
  const url = `${OURA_API_BASE}/v2/usercollection/sleep?start_date=${startDate}&end_date=${endDate}`
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Oura API error (sleep): ${error}`)
  }

  const data = await response.json()
  return data.data || []
}
