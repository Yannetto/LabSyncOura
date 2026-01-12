import { createServiceClient } from '@/lib/supabase/service'
import { getValidAccessToken } from './tokens'
import { fetchOuraDailyData, fetchSleepData } from './client'
import { mapDailySleep, mapSleepRecord, mapDailyReadiness, mapDailyActivity, mapDailyStress, mapDailySpo2 } from './map'

const COLLECTIONS = ['daily_sleep', 'daily_readiness', 'daily_activity', 'daily_stress', 'daily_spo2']

const DEBUG = process.env.OURA_DEBUG === '1'

// Mapping functions for each collection
const COLLECTION_MAPPERS: { [key: string]: (record: any) => { day: string; metrics: Array<{ metric_key: string; value: string }> } | null } = {
  'daily_sleep': mapDailySleep,
  'daily_readiness': mapDailyReadiness,
  'daily_activity': mapDailyActivity,
  'daily_stress': mapDailyStress,
  'daily_spo2': mapDailySpo2,
}

export async function syncOuraData(userId: string, days: number = 30, forceResync: boolean = false): Promise<number> {
  const supabase = createServiceClient()
  const accessToken = await getValidAccessToken(userId)

  if (!accessToken) {
    throw new Error('No valid Oura access token')
  }

  // Get the most recent synced date from database
  const { data: latestData } = await supabase
    .from('oura_daily')
    .select('day')
    .eq('user_id', userId)
    .order('day', { ascending: false })
    .limit(1)
    .single()

  // Calculate date range
  const endDate = new Date()
  endDate.setHours(0, 0, 0, 0)
  endDate.setDate(endDate.getDate() - 1) // Exclude today (incomplete data)
  
  let startDate: Date
  if (forceResync || !latestData?.day) {
    // Force re-sync or first sync: fetch last 90 days (or specified days)
    startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    startDate.setDate(startDate.getDate() - Math.max(days, 90))
    if (forceResync) {
      console.log(`[Sync] Force re-sync enabled: fetching last ${Math.max(days, 90)} days`)
    }
  } else {
    // Incremental sync: start from day after last synced date
    startDate = new Date(latestData.day)
    startDate.setHours(0, 0, 0, 0)
    startDate.setDate(startDate.getDate() + 1)
  }

  // Ensure we don't go back too far (Oura typically has ~1 year of data)
  const oneYearAgo = new Date()
  oneYearAgo.setHours(0, 0, 0, 0)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  if (startDate < oneYearAgo) {
    startDate = oneYearAgo
  }

  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  // Validate date range: start must be <= end (compare as strings to avoid timezone issues)
  if (startDateStr > endDateStr) {
    console.log(`[Sync] Start date (${startDateStr}) is after end date (${endDateStr}). No new data to sync.`)
    return 0 // No days to sync
  }

  console.log(`[Sync] Fetching data from ${startDateStr} to ${endDateStr}`)

  const syncedDays = new Set<string>()

  // Helper to deduplicate metrics by metric_key (keep last value if duplicate)
  const deduplicateMetrics = (metrics: Array<{ metric_key: string; value: string }>): Array<{ metric_key: string; value: string }> => {
    const seen = new Map<string, string>()
    for (const metric of metrics) {
      seen.set(metric.metric_key, metric.value)
    }
    return Array.from(seen.entries()).map(([metric_key, value]) => ({ metric_key, value }))
  }

  // Helper to store metrics with deduplication - BATCHED for performance
  const storeMetrics = async (
    userId: string,
    day: string,
    metrics: Array<{ metric_key: string; value: string }>,
    source: string
  ): Promise<{ stored: number; failed: number }> => {
    const dayFormatted = day.includes('T') ? day.split('T')[0] : day
    const deduped = deduplicateMetrics(metrics)
    
    if (deduped.length === 0) {
      return { stored: 0, failed: 0 }
    }

    // Batch all metrics for this day into a single upsert operation
    const records = deduped.map(metric => ({
      user_id: userId,
      day: dayFormatted,
      metric_key: metric.metric_key,
      value: metric.value,
    }))

    const { error: upsertError } = await supabase
      .from('oura_daily')
      .upsert(records, {
        onConflict: 'user_id,day,metric_key',
      })
    
    if (upsertError) {
      console.error(`[Sync] [${source}] Failed to batch upsert ${deduped.length} metrics for ${dayFormatted}:`, upsertError)
      return { stored: 0, failed: deduped.length }
    }

    return { stored: deduped.length, failed: 0 }
  }

  // Fetch data from all daily collections
  for (const collection of COLLECTIONS) {
    try {
      const data = await fetchOuraDailyData(accessToken, collection, startDateStr, endDateStr)
      console.log(`[Sync] Fetched ${data.length} items from ${collection}`)
      
      if (data.length === 0) {
        console.warn(`[Sync] No data returned for ${collection} (${startDateStr} to ${endDateStr})`)
        continue
      }

      // Log actual API response structure (first record only)
      if (data.length > 0) {
        const sample = data[0]
        console.log(`[Sync] ${collection} - Sample keys:`, Object.keys(sample))
        if (sample.contributors) {
          console.log(`[Sync] ${collection} - contributors keys:`, Object.keys(sample.contributors))
        }
      }

      const mapper = COLLECTION_MAPPERS[collection]
      if (!mapper) {
        console.error(`[Sync] No mapper found for collection: ${collection}`)
        continue
      }

      // Batch all metrics by day for bulk insert
      const metricsByDay = new Map<string, Array<{ metric_key: string; value: string }>>()
      let itemsProcessed = 0

      for (const item of data) {
        // Use the mapping layer to extract metrics
        const mapped = mapper(item)
        
        if (!mapped) {
          continue
        }

        const { day, metrics } = mapped
        syncedDays.add(day)
        itemsProcessed++

        // Log what metrics were extracted (first item only)
        if (itemsProcessed === 1 && metrics.length > 0) {
          console.log(`[Sync] ${collection} - Extracted metrics:`, metrics.map(m => m.metric_key))
        } else if (itemsProcessed === 1 && metrics.length === 0) {
          console.warn(`[Sync] ${collection} - No metrics extracted from first record`)
        }

        // Accumulate metrics by day for batch processing
        if (!metricsByDay.has(day)) {
          metricsByDay.set(day, [])
        }
        const existingMetrics = metricsByDay.get(day)!
        metricsByDay.set(day, [...existingMetrics, ...metrics])
      }

      // Batch store all metrics for all days in this collection
      let metricsStored = 0
      let metricsFailed = 0

      // Process in batches of 10 days to avoid overwhelming the database
      const days = Array.from(metricsByDay.keys())
      const BATCH_SIZE = 10
      
      for (let i = 0; i < days.length; i += BATCH_SIZE) {
        const dayBatch = days.slice(i, i + BATCH_SIZE)
        const batchRecords: Array<{ user_id: string; day: string; metric_key: string; value: string }> = []
        
        for (const day of dayBatch) {
          const dayFormatted = day.includes('T') ? day.split('T')[0] : day
          const dayMetrics = deduplicateMetrics(metricsByDay.get(day)!)
          
          for (const metric of dayMetrics) {
            batchRecords.push({
              user_id: userId,
              day: dayFormatted,
              metric_key: metric.metric_key,
              value: metric.value,
            })
          }
        }

        if (batchRecords.length > 0) {
          const { error: upsertError } = await supabase
            .from('oura_daily')
            .upsert(batchRecords, {
              onConflict: 'user_id,day,metric_key',
            })
          
          if (upsertError) {
            console.error(`[Sync] [${collection}] Failed to batch upsert ${batchRecords.length} metrics:`, upsertError)
            metricsFailed += batchRecords.length
          } else {
            metricsStored += batchRecords.length
          }
        }
      }
      
      console.log(`[Sync] ${collection}: ${itemsProcessed} items processed, ${metricsStored} metrics stored, ${metricsFailed} failed`)
    } catch (error: any) {
      console.error(`[Sync] Error syncing ${collection}:`, error)
      
      // Check for scope/permission errors
      if (error.message?.includes('403') || error.message?.includes('401')) {
        console.error(`[Sync] Possible scope/permission issue for ${collection}. Check OAuth scopes.`)
      }
      
      // Continue with other collections
    }
  }

  // Fetch sleep records (non-daily endpoint) for actual durations
  try {
    console.log(`[Sync] Fetching sleep records from ${startDateStr} to ${endDateStr}`)
    const sleepData = await fetchSleepData(accessToken, startDateStr, endDateStr)
    console.log(`[Sync] Fetched ${sleepData.length} sleep records`)

    if (sleepData.length > 0) {
      // Group sleep records by day
      const sleepByDay = new Map<string, any[]>()
      for (const record of sleepData) {
        const day = normalizeDate(record.day || record.date || record.timestamp)
        if (!day) continue
        
        if (!sleepByDay.has(day)) {
          sleepByDay.set(day, [])
        }
        sleepByDay.get(day)!.push(record)
      }

      let sleepRecordsProcessed = 0
      
      // Batch all sleep metrics by day for bulk insert
      const sleepMetricsByDay = new Map<string, Array<{ metric_key: string; value: string }>>()

      // Process one sleep record per day (prefer main sleep or largest duration)
      for (const [day, records] of sleepByDay.entries()) {
        syncedDays.add(day)
        
        // If multiple records, prefer:
        // 1. Record with main: true
        // 2. Record with largest total_sleep_duration
        let selectedRecord = records[0]
        if (records.length > 1) {
          const mainSleep = records.find((r: any) => r.main === true)
          if (mainSleep) {
            selectedRecord = mainSleep
          } else {
            // Find record with largest total_sleep_duration
            selectedRecord = records.reduce((max: any, r: any) => {
              const maxDuration = max.total_sleep_duration || 0
              const rDuration = r.total_sleep_duration || 0
              return rDuration > maxDuration ? r : max
            }, records[0])
          }
          
          if (DEBUG && records.length > 1) {
            console.log(`[Sync] [sleep] Multiple records for ${day}, selected one with duration ${selectedRecord.total_sleep_duration}s`)
          }
        }

        const mapped = mapSleepRecord(selectedRecord)
        if (!mapped) {
          continue
        }

        sleepRecordsProcessed++

        // Log what metrics were extracted (first item only)
        if (sleepRecordsProcessed === 1 && mapped.metrics.length > 0) {
          console.log(`[Sync] sleep - Extracted metrics:`, mapped.metrics.map(m => m.metric_key))
        }

        // Accumulate metrics by day for batch processing
        if (!sleepMetricsByDay.has(mapped.day)) {
          sleepMetricsByDay.set(mapped.day, [])
        }
        const existingMetrics = sleepMetricsByDay.get(mapped.day)!
        sleepMetricsByDay.set(mapped.day, [...existingMetrics, ...mapped.metrics])
      }

      // Batch store all sleep metrics
      let sleepMetricsStored = 0
      let sleepMetricsFailed = 0

      // Process in batches of 10 days
      const sleepDays = Array.from(sleepMetricsByDay.keys())
      const BATCH_SIZE = 10
      
      for (let i = 0; i < sleepDays.length; i += BATCH_SIZE) {
        const dayBatch = sleepDays.slice(i, i + BATCH_SIZE)
        const batchRecords: Array<{ user_id: string; day: string; metric_key: string; value: string }> = []
        
        for (const day of dayBatch) {
          const dayFormatted = day.includes('T') ? day.split('T')[0] : day
          const dayMetrics = deduplicateMetrics(sleepMetricsByDay.get(day)!)
          
          for (const metric of dayMetrics) {
            batchRecords.push({
              user_id: userId,
              day: dayFormatted,
              metric_key: metric.metric_key,
              value: metric.value,
            })
          }
        }

        if (batchRecords.length > 0) {
          const { error: upsertError } = await supabase
            .from('oura_daily')
            .upsert(batchRecords, {
              onConflict: 'user_id,day,metric_key',
            })
          
          if (upsertError) {
            console.error(`[Sync] [sleep] Failed to batch upsert ${batchRecords.length} metrics:`, upsertError)
            sleepMetricsFailed += batchRecords.length
          } else {
            sleepMetricsStored += batchRecords.length
          }
        }
      }

      console.log(`[Sync] sleep: ${sleepRecordsProcessed} records processed, ${sleepMetricsStored} metrics stored, ${sleepMetricsFailed} failed`)
    } else {
      console.warn(`[Sync] No sleep records returned (${startDateStr} to ${endDateStr})`)
    }
  } catch (error: any) {
    console.error(`[Sync] Error syncing sleep records:`, error)
    
    // Check for scope/permission errors
    if (error.message?.includes('403') || error.message?.includes('401')) {
      console.error(`[Sync] Possible scope/permission issue for sleep endpoint. Check OAuth scopes.`)
    }
    
    // Continue - sleep endpoint might not be available or have different scopes
  }

  return syncedDays.size
}

// Helper function to normalize date (same as in map.ts)
function normalizeDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null
  return dateStr.split('T')[0]
}
