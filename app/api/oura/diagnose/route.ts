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
      .limit(5000)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Group by metric_key
    const metricKeyCounts: { [key: string]: number } = {}
    const metricKeySamples: { [key: string]: { day: string; value: string }[] } = {}
    const uniqueDays = new Set<string>()
    
    allData?.forEach((record: any) => {
      const key = record.metric_key
      metricKeyCounts[key] = (metricKeyCounts[key] || 0) + 1
      uniqueDays.add(record.day)
      if (!metricKeySamples[key]) {
        metricKeySamples[key] = []
      }
      if (metricKeySamples[key].length < 3) {
        metricKeySamples[key].push({ day: record.day, value: record.value })
      }
    })

    // Keys needed for the report (matching the expected output format)
    const reportKeys = {
      sleep: [
        'sleep_time_in_bed_seconds',     // Time in Bed
        'sleep_total_sleep_duration_seconds', // Sleep Duration
        'sleep_duration',                // Sleep Duration (alias)
        'sleep_deep_pct',                // Deep Sleep %
        'deep_sleep_percentage',         // Deep Sleep % (alias)
        'sleep_deep_sleep_duration_seconds', // Deep Sleep Duration
        'sleep_light_pct',               // Light Sleep %
        'light_sleep_percentage',        // Light Sleep % (alias)
        'sleep_light_sleep_duration_seconds', // Light Sleep Duration
        'sleep_rem_pct',                 // REM Sleep %
        'rem_sleep_percentage',          // REM Sleep % (alias)
        'sleep_rem_sleep_duration_seconds', // REM Sleep Duration
      ],
      cardiovascular: [
        'resting_heart_rate',            // Resting Heart Rate (from sleep.lowest_heart_rate)
        'sleep_lowest_heart_rate',       // Lowest Night-time Heart Rate
        'sleep_average_hrv',             // Night-time HRV
        'hrv_rmssd',                      // HRV (alias)
        'spo2_percentage_average',       // Oxygen Saturation (SpO2)
        'breathing_disturbance_index',   // Breathing Disturbance Index
        'temperature_deviation',         // Temperature Deviation
        'readiness_temperature_deviation', // Temperature Deviation (alias)
        'readiness_temperature_trend_deviation', // Temperature Trend Deviation
        'recovery_high',                 // Recovery High (time in high recovery zone)
      ],
      activity: [
        'steps',                         // Steps
        'sedentary_time_seconds',        // Sedentary Time
        'sedentary_time',                // Sedentary Time (alias)
        'active_calories',                // Active Calories
        'total_calories',                // Total Calories
        'high_activity_time_seconds',     // High Activity Time
        'medium_activity_time_seconds',  // Medium Activity Time
        'low_activity_time_seconds',     // Low Activity Time
        'resting_time_seconds',          // Resting Time
      ],
      sleep_additional: [
        'sleep_latency_seconds',         // Sleep Latency
        'sleep_latency',                 // Sleep Latency (alias)
        'sleep_efficiency_pct',          // Sleep Efficiency
        'sleep_efficiency',              // Sleep Efficiency (alias)
      ],
    }

    // Check which keys exist
    const checkKeys = (keys: string[]) => keys.map(key => ({
      key,
      found: !!metricKeyCounts[key],
      count: metricKeyCounts[key] || 0,
      samples: metricKeySamples[key] || []
    }))

    const allKeys = Object.keys(metricKeyCounts).sort()

    return NextResponse.json({
      summary: {
        total_records: allData?.length || 0,
        unique_days: uniqueDays.size,
        unique_metric_keys: allKeys.length,
        date_range: {
          earliest: [...uniqueDays].sort()[0],
          latest: [...uniqueDays].sort().pop(),
        }
      },
      report_keys: {
        sleep: checkKeys(reportKeys.sleep),
        sleep_additional: checkKeys(reportKeys.sleep_additional),
        cardiovascular: checkKeys(reportKeys.cardiovascular),
        activity: checkKeys(reportKeys.activity),
      },
      all_metric_keys: allKeys.map(key => ({
        key,
        count: metricKeyCounts[key],
        samples: metricKeySamples[key]
      })),
    })
  } catch (error: any) {
    console.error('Diagnose error:', error)
    return NextResponse.json(
      { error: error.message || 'Diagnosis failed' },
      { status: 500 }
    )
  }
}
