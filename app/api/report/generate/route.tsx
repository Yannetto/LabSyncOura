import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Force Node.js runtime and disable static optimization
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceSupabase = createServiceClient()

    // Check if data exists - NO automatic syncing
    const { data: existingData } = await serviceSupabase
      .from('oura_daily')
      .select('day')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!existingData) {
      // Return error - user must sync first
      return NextResponse.json(
        { error: 'No data available. Please sync your Oura data first.' },
        { status: 400 }
      )
    }

    // Simply return success - the report page will fetch and display the data
    return NextResponse.json({ 
      ok: true, 
      redirect_url: '/app/report',
    })
  } catch (error: any) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: error.message || 'Report generation failed' },
      { status: 500 }
    )
  }
}
