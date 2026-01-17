import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/oura/tokens'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ connected: false }, { status: 401 })
  }

  try {
    const token = await getValidAccessToken(user.id)
    return NextResponse.json({ connected: !!token })
  } catch (error) {
    return NextResponse.json({ connected: false })
  }
}
