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
    
    // Get all stored metric keys with counts
    const { data: allData, error: fetchError } = await serviceSupabase
      .from('oura_daily')
      .select('day, metric_key, value')
      .eq('user_id', user.id)
      .order('day', { ascending: false })
      .limit(1000)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Group by metric_key
    const metricKeyCounts: { [key: string]: number } = {}
    const metricKeySamples: { [key: string]: { day: string; value: string } } = {}
    
    allData?.forEach((record: any) => {
      const key = record.metric_key
      metricKeyCounts[key] = (metricKeyCounts[key] || 0) + 1
      if (!metricKeySamples[key]) {
        metricKeySamples[key] = { day: record.day, value: record.value }
      }
    })

    // Check for required keys
    const requiredKeys = [
      'sleep_duration', 'sleep_efficiency', 'sleep_latency', 
      'rem_sleep_percentage', 'deep_sleep_percentage',
      'resting_heart_rate', 'hrv_rmssd',
      'steps', 'high_stress', 'active_calories'
    ]
    
    const missingKeys = requiredKeys.filter(key => !metricKeyCounts[key])
    const foundKeys = requiredKeys.filter(key => metricKeyCounts[key])

    // Find similar keys (might be typos or different naming)
    const allKeys = Object.keys(metricKeyCounts).sort()
    const sleepRelated = allKeys.filter(k => k.toLowerCase().includes('sleep'))
    const hrRelated = allKeys.filter(k => 
      k.toLowerCase().includes('heart') || 
      k.toLowerCase().includes('hrv') || 
      k.toLowerCase().includes('hr') ||
      k.toLowerCase().includes('resting')
    )

    return NextResponse.json({
      summary: {
        total_records: allData?.length || 0,
        unique_metric_keys: allKeys.length,
        required_keys_found: foundKeys.length,
        required_keys_missing: missingKeys.length,
      },
      required_keys: {
        found: foundKeys.map(key => ({
          key,
          count: metricKeyCounts[key],
          sample: metricKeySamples[key]
        })),
        missing: missingKeys
      },
      all_metric_keys: allKeys.map(key => ({
        key,
        count: metricKeyCounts[key],
        sample: metricKeySamples[key]
      })),
      related_keys: {
        sleep_related: sleepRelated,
        heart_hrv_related: hrRelated
      }
    })
  } catch (error: any) {
    console.error('Diagnose error:', error)
    return NextResponse.json(
      { error: error.message || 'Diagnosis failed' },
      { status: 500 }
    )
  }
}
