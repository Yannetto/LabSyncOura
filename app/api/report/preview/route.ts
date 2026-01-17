import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { calculateReportMetrics } from '@/lib/report/calculations'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceSupabase = createServiceClient()
    const { data: dailyData, error: fetchError } = await serviceSupabase
      .from('oura_daily')
      .select('day, metric_key, value')
      .eq('user_id', user.id)
      .order('day', { ascending: false })
      .limit(1000)

    if (fetchError) {
      console.error('[Preview] Database fetch error:', fetchError)
      throw fetchError
    }

    console.log('[Preview] Fetched from database:', dailyData?.length || 0, 'records')
    if (dailyData && dailyData.length > 0) {
      console.log('[Preview] Sample record:', dailyData[0])
      console.log('[Preview] Date range:', {
        earliest: dailyData[dailyData.length - 1]?.day,
        latest: dailyData[0]?.day
      })
      console.log('[Preview] Unique metric_keys:', [...new Set(dailyData.map(d => d.metric_key))].sort())
    }

    const metrics = calculateReportMetrics(dailyData || [])
    console.log('[Preview] Calculated metrics:', metrics.length)
    console.log('[Preview] Sample metric:', metrics[0])
    return NextResponse.json({ metrics })
  } catch (error: any) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: error.message || 'Preview failed' },
      { status: 500 }
    )
  }
}
