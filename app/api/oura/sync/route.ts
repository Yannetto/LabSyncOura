import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncOuraData } from '@/lib/oura/sync'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if force re-sync is requested (query param or body)
    const { searchParams } = new URL(request.url)
    const forceResync = searchParams.get('force') === '1'
    
    const daysSynced = await syncOuraData(user.id, 30, forceResync)
    const syncTimestamp = new Date().toISOString()
    
    return NextResponse.json({ 
      ok: true, 
      days_synced: daysSynced,
      synced_at: syncTimestamp
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    
    // Check for scope/permission errors
    if (error.message?.includes('403') || error.message?.includes('401') || error.message?.includes('scope')) {
      return NextResponse.json(
        { error: 'Permission denied. Please reconnect your Oura account with the "daily" scope.' },
        { status: 403 }
      )
    }
    
    // Check for no data available
    if (error.message?.includes('No data') || error.message?.includes('No sleep summaries')) {
      return NextResponse.json(
        { error: 'No data available for the selected period. Please check your Oura account has data for this time range.' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    )
  }
}
