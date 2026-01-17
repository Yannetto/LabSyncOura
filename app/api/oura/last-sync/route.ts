import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceSupabase = createServiceClient()
    
    // Get the most recent day from synced data
    const { data: latestData, error: fetchError } = await serviceSupabase
      .from('oura_daily')
      .select('day, created_at')
      .eq('user_id', user.id)
      .order('day', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !latestData) {
      return NextResponse.json({ last_synced: null })
    }

    // Use created_at as last sync time, or day if created_at not available
    const lastSynced = latestData.created_at || latestData.day
    
    return NextResponse.json({ 
      last_synced: lastSynced 
    })
  } catch (error: any) {
    console.error('Last sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get last sync' },
      { status: 500 }
    )
  }
}
