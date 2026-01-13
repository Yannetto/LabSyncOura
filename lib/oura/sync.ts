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

interface CollectionResult {
  collection: string
  data: any[]
  error?: string
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

  // Validate date range: start must be <= end
  if (startDateStr > endDateStr) {
    console.log(`[Sync] Start date (${startDateStr}) is after end date (${endDateStr}). No new data to sync.`)
    return 0
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

  // PARALLEL FETCH: Fetch all daily collections + sleep endpoint simultaneously
  console.log(`[Sync] Starting parallel fetch for ${COLLECTIONS.length} daily collections + sleep`)
  const fetchStartTime = Date.now()

  const collectionPromises = COLLECTIONS.map(async (collection): Promise<CollectionResult> => {
    try {
      const data = await fetchOuraDailyData(accessToken, collection, startDateStr, endDateStr)
      return { collection, data }
    } catch (error: any) {
      console.error(`[Sync] Error fetching ${collection}:`, error.message)
      return { collection, data: [], error: error.message }
    }
  })

  // Fetch sleep data (provides actual durations, HR, HRV) in parallel
  const sleepPromise = fetchSleepData(accessToken, startDateStr, endDateStr)
    .then(data => ({ collection: 'sleep', data }))
    .catch(error => ({ collection: 'sleep', data: [], error: error.message }))

  // Wait for all fetches to complete in parallel
  const allResults = await Promise.all([...collectionPromises, sleepPromise])
  
  const fetchDuration = Date.now() - fetchStartTime
  console.log(`[Sync] Parallel fetch completed in ${fetchDuration}ms`)

  // Collect all metrics to batch insert at the end
  const allMetricRecords: Array<{ user_id: string; day: string; metric_key: string; value: string }> = []

  // Process each daily collection's results
  for (const result of allResults) {
    const { collection, data, error } = result as CollectionResult

    // Skip sleep - processed separately below
    if (collection === 'sleep') continue

    if (error) {
      console.error(`[Sync] Skipping ${collection} due to fetch error: ${error}`)
      continue
    }

    console.log(`[Sync] Processing ${data.length} items from ${collection}`)
    
    if (data.length === 0) continue

    // Log sample for debugging
    if (DEBUG && data.length > 0) {
      const sample = data[0]
      console.log(`[Sync] ${collection} sample:`, JSON.stringify(sample, null, 2).substring(0, 500))
    }

    const mapper = COLLECTION_MAPPERS[collection]
    if (!mapper) continue

    for (const item of data) {
      const mapped = mapper(item)
      if (!mapped) continue

      const { day, metrics } = mapped
      syncedDays.add(day)

      for (const metric of metrics) {
        allMetricRecords.push({
          user_id: userId,
          day,
          metric_key: metric.metric_key,
          value: metric.value,
        })
      }
    }
    
    console.log(`[Sync] ${collection}: processed ${data.length} items`)
  }

  // Process sleep data - this is the key source for actual durations, HR, HRV
  const sleepResult = allResults.find(r => (r as CollectionResult).collection === 'sleep') as CollectionResult
  const sleepData = sleepResult?.data || []
  
  if (sleepResult?.error) {
    console.error(`[Sync] Sleep fetch error: ${sleepResult.error}`)
  }
  
  console.log(`[Sync] Processing ${sleepData.length} sleep records`)

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

    // Process one sleep record per day (prefer main sleep or largest duration)
    for (const [day, records] of sleepByDay.entries()) {
      syncedDays.add(day)
      
      // Select best record: main sleep first, then largest duration
      let selectedRecord = records[0]
      if (records.length > 1) {
        const mainSleep = records.find((r: any) => r.main === true)
        if (mainSleep) {
          selectedRecord = mainSleep
        } else {
          selectedRecord = records.reduce((max: any, r: any) => {
            return (r.total_sleep_duration || 0) > (max.total_sleep_duration || 0) ? r : max
          }, records[0])
        }
      }

      const mapped = mapSleepRecord(selectedRecord)
      if (!mapped) continue

      for (const metric of mapped.metrics) {
        allMetricRecords.push({
          user_id: userId,
          day: mapped.day,
          metric_key: metric.metric_key,
          value: metric.value,
        })
      }
    }
    
    console.log(`[Sync] Sleep: processed ${sleepByDay.size} days`)
  }

  // Deduplicate all records (in case of duplicates across endpoints)
  const dedupedByDayMetric = new Map<string, { user_id: string; day: string; metric_key: string; value: string }>()
  for (const record of allMetricRecords) {
    const key = `${record.day}:${record.metric_key}`
    dedupedByDayMetric.set(key, record) // Last write wins
  }
  const finalRecords = Array.from(dedupedByDayMetric.values())

  console.log(`[Sync] Total metrics to store: ${finalRecords.length} (deduplicated from ${allMetricRecords.length})`)

  // Batch upsert all records efficiently (no .select() needed)
  if (finalRecords.length > 0) {
    const BATCH_SIZE = 500 // Larger batches for efficiency
    let totalStored = 0
    let totalFailed = 0
    
    for (let i = 0; i < finalRecords.length; i += BATCH_SIZE) {
      const batch = finalRecords.slice(i, i + BATCH_SIZE)
      
      const { error: upsertError } = await supabase
        .from('oura_daily')
        .upsert(batch, { onConflict: 'user_id,day,metric_key' })
      
      if (upsertError) {
        console.error(`[Sync] Batch upsert failed:`, upsertError.message)
        totalFailed += batch.length
      } else {
        totalStored += batch.length
      }
    }
    
    console.log(`[Sync] Database: ${totalStored} stored, ${totalFailed} failed`)
  }

  console.log(`[Sync] Complete: ${syncedDays.size} days synced`)
  return syncedDays.size
}

// Helper function to normalize date
function normalizeDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null
  return dateStr.split('T')[0]
}
