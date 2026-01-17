import type { ReportMetric } from './calculations'

interface DoctorSummary {
  sleepTable: Array<{
    metric: string
    value: string
    referenceRange: string
    flag: string
  }>
  cardiovascularTable: Array<{
    metric: string
    value: string
    referenceRange: string
    flag: string
  }>
  activityTable: Array<{
    metric: string
    value: string
    referenceRange: string
    flag: string
  }>
}

/**
 * Parse reference range string like "7h 30m – 8h 15m" or "60–70 bpm"
 * Returns { lower: number, upper: number } or null if can't parse
 */
function parseReferenceRange(refRange: string): { lower: number; upper: number } | null {
  if (!refRange || refRange === '—') return null
  
  // Remove trailing % or units from the entire string (e.g., "65.0–73.3%" -> "65.0–73.3")
  // This handles cases where the % is at the end of the range string
  const cleaned = refRange.replace(/\s*%$/, '').trim()
  
  // Split by "–" (em dash) or "-" (regular dash)
  const parts = cleaned.split(/[–-]/).map(s => s.trim())
  if (parts.length !== 2) return null
  
  const [lowerStr, upperStr] = parts
  
  // Try to parse as numbers (handles "60–70", "60.5–70.2", "65.0–73.3")
  const lower = parseFloat(lowerStr)
  const upper = parseFloat(upperStr)
  
  if (!isNaN(lower) && !isNaN(upper)) {
    return { lower, upper }
  }
  
  // Try to parse duration strings like "7h 30m" to minutes
  const parseDuration = (str: string): number | null => {
    const hMatch = str.match(/(\d+)\s*h/)
    const mMatch = str.match(/(\d+)\s*min/)
    const hours = hMatch ? parseInt(hMatch[1]) : 0
    const minutes = mMatch ? parseInt(mMatch[1]) : 0
    return hours * 60 + minutes
  }
  
  const lowerMinutes = parseDuration(lowerStr)
  const upperMinutes = parseDuration(upperStr)
  
  if (lowerMinutes !== null && upperMinutes !== null) {
    return { lower: lowerMinutes, upper: upperMinutes }
  }
  
  return null
}

/**
 * Parse result value to number for comparison
 */
function parseResultValue(result: string): number | null {
  if (!result || result === '—') return null
  
  // Try direct number parse
  const num = parseFloat(result)
  if (!isNaN(num)) return num
  
  // Try duration parsing (e.g., "7h 30m" -> minutes)
  const hMatch = result.match(/(\d+)\s*h/)
  const mMatch = result.match(/(\d+)\s*min/)
  if (hMatch || mMatch) {
    const hours = hMatch ? parseInt(hMatch[1]) : 0
    const minutes = mMatch ? parseInt(mMatch[1]) : 0
    return hours * 60 + minutes
  }
  
  // Try percentage (e.g., "85.5%")
  const pctMatch = result.match(/(\d+\.?\d*)\s*%/)
  if (pctMatch) {
    return parseFloat(pctMatch[1])
  }
  
  // Try with units (e.g., "60 bpm", "45 ms")
  const numMatch = result.match(/(\d+\.?\d*)/)
  if (numMatch) {
    return parseFloat(numMatch[1])
  }
  
  return null
}

/**
 * Compute flag based on result vs reference range
 * Only computes flags for metrics that are allowed to have flags
 */
function computeFlag(metricName: string, result: string, referenceRange: string): string {
  const normalizedName = normalizeMetricName(metricName)
  
  // Check if this metric is allowed to have flags
  let canHaveFlag = false
  for (const allowedMetric of METRICS_WITH_FLAGS) {
    if (normalizedName.includes(allowedMetric)) {
      canHaveFlag = true
      break
    }
  }
  
  if (!canHaveFlag) {
    return '' // This metric must never have flags
  }
  
  const resultNum = parseResultValue(result)
  const refRange = parseReferenceRange(referenceRange)
  
  if (resultNum === null || refRange === null) {
    return '' // Can't compute flag
  }
  
  // Use single flag text for both high and low
  if (resultNum > refRange.upper || resultNum < refRange.lower) {
    return '🟥'
  }
  
  return '' // Within range
}

/**
 * Normalize metric name for matching
 */
function normalizeMetricName(name: string): string {
  return name.toLowerCase()
    .replace(/\s*\(raw\)\s*/gi, '')
    .replace(/\s*contrib\s*score\s*/gi, '')
    .trim()
}

/**
 * Metrics to keep - exact matches and synonyms
 * Only these metrics will be included in the report
 */
const KEEP_METRICS = {
  sleep: [
    'time in bed',
    'sleep duration',
    'deep sleep %',
    'deep sleep percentage',
    'deep sleep duration',
    'light sleep %',
    'light sleep percentage',
    'light sleep duration',
    'rem sleep %',
    'rem sleep percentage',
    'rem sleep duration',
  ],
  cardiovascular: [
    'resting heart rate',
    'resting hr',
    'lowest night-time heart rate',
    'night-time hrv',
    'readiness hrv balance', // This will be renamed to "Night-time HRV"
    'sleep average hrv',
    'average nightly spo2',
    'average nightly sp', // Variant without "o2"
    'spo2 percentage average',
    'oxygen saturation',
    'spo2',
    'breathing disturbance index',
    'temperature deviation',
  ],
  activity: [
    'steps',
    'sedentary time',
  ],
}

/**
 * Metrics that CAN have flags (computed from reference range)
 * All other metrics must have blank flags
 */
const METRICS_WITH_FLAGS = new Set([
  'sleep duration',
  'resting heart rate',
  'resting hr',
  'lowest night-time heart rate',
  'sleep lowest heart rate',
  'night-time hrv',
  'readiness hrv balance',
  'sleep average hrv',
  'oxygen saturation',
  'spo2',
  'average nightly spo2',
  'spo2 percentage average',
  'breathing disturbance index',
  'temperature deviation',
  'readiness temperature deviation',
  'steps',
  'sedentary time',
  // Sleep percentages
  'deep sleep',
  'light sleep',
  'rem sleep',
])

/**
 * Check if metric should be kept
 */
function shouldKeepMetric(metricName: string): { keep: boolean; category?: 'sleep' | 'cardiovascular' | 'activity' } {
  const normalized = normalizeMetricName(metricName)
  
  for (const metric of KEEP_METRICS.sleep) {
    if (normalized === metric || normalized.includes(metric) || metric.includes(normalized)) {
      return { keep: true, category: 'sleep' }
    }
  }
  
  for (const metric of KEEP_METRICS.cardiovascular) {
    // Check both directions: normalized includes metric OR metric includes normalized
    if (normalized === metric || normalized.includes(metric) || metric.includes(normalized)) {
      return { keep: true, category: 'cardiovascular' }
    }
  }
  
  for (const metric of KEEP_METRICS.activity) {
    if (normalized === metric || normalized.includes(metric) || metric.includes(normalized)) {
      return { keep: true, category: 'activity' }
    }
  }
  
  // Debug: Log if we're looking for SpO2 or BDI metrics
  if (normalized.includes('spo2') || normalized.includes('breathing') || normalized.includes('disturbance')) {
    console.log(`[DoctorSummary] shouldKeepMetric: "${metricName}" (normalized: "${normalized}") not matched in KEEP_METRICS`)
    console.log(`[DoctorSummary] Available cardiovascular metrics to match:`, KEEP_METRICS.cardiovascular)
  }
  
  return { keep: false }
}

/**
 * Deduplicate metrics - keep best one per normalized name
 */
function deduplicateMetrics(metrics: ReportMetric[]): ReportMetric[] {
  const byNormalizedName = new Map<string, ReportMetric[]>()
  
  for (const metric of metrics) {
    const normalized = normalizeMetricName(metric.metric)
    if (!byNormalizedName.has(normalized)) {
      byNormalizedName.set(normalized, [])
    }
    byNormalizedName.get(normalized)!.push(metric)
  }
  
  const result: ReportMetric[] = []
  
  for (const [_, metricsList] of byNormalizedName.entries()) {
    if (metricsList.length === 1) {
      result.push(metricsList[0])
      continue
    }
    
    // Prefer metric with human-readable units
    let best = metricsList[0]
    for (const metric of metricsList.slice(1)) {
      const bestHasUnits = best.result_display.includes('h ') || 
                          best.result_display.includes('min') ||
                          best.result_display.includes('%') ||
                          best.result_display.includes('bpm') ||
                          best.result_display.includes('ms')
      const currentHasUnits = metric.result_display.includes('h ') || 
                            metric.result_display.includes('min') ||
                            metric.result_display.includes('%') ||
                            metric.result_display.includes('bpm') ||
                            metric.result_display.includes('ms')
      
      if (!bestHasUnits && currentHasUnits) {
        best = metric
      } else if (best.result_display === '—' && metric.result_display !== '—') {
        best = metric
      }
    }
    
    result.push(best)
  }
  
  return result
}

/**
 * Format doctor-friendly summary
 */
export function formatDoctorSummary(metrics: ReportMetric[]): DoctorSummary {
  // Debug: Log all incoming metrics (especially SpO2/Breathing)
  const spo2Metrics = metrics.filter(m => {
    const n = normalizeMetricName(m.metric)
    return n.includes('spo2') || n.includes('breathing') || n.includes('disturbance')
  })
  if (spo2Metrics.length > 0) {
    console.log(`[DoctorSummary] SpO2/Breathing metrics found in input:`, spo2Metrics.map(m => `${m.metric} (normalized: ${normalizeMetricName(m.metric)})`))
  } else {
    console.log(`[DoctorSummary] NO SpO2/Breathing metrics in input. Total metrics:`, metrics.length)
    console.log(`[DoctorSummary] Sample metric names:`, metrics.slice(0, 10).map(m => m.metric))
  }
  
  // Step 1: Filter to keep only specified metrics
  const filtered = metrics.filter(m => shouldKeepMetric(m.metric).keep)
  
  const spo2Filtered = filtered.filter(m => {
    const n = normalizeMetricName(m.metric)
    return n.includes('spo2') || n.includes('breathing') || n.includes('disturbance')
  })
  if (spo2Filtered.length > 0) {
    console.log(`[DoctorSummary] SpO2/Breathing metrics after filtering:`, spo2Filtered.map(m => m.metric))
  } else if (spo2Metrics.length > 0) {
    console.log(`[DoctorSummary] WARNING: SpO2/Breathing metrics were FILTERED OUT!`)
  }
  
  // Step 2: Deduplicate
  const deduplicated = deduplicateMetrics(filtered)
  
  // Step 3: Group by category and compute flags
  const sleep: ReportMetric[] = []
  const cardiovascular: ReportMetric[] = []
  const activity: ReportMetric[] = []
  
  for (const metric of deduplicated) {
    const { category } = shouldKeepMetric(metric.metric)
    if (category === 'sleep') sleep.push(metric)
    else if (category === 'cardiovascular') cardiovascular.push(metric)
    else if (category === 'activity') activity.push(metric)
  }
  
  console.log(`[DoctorSummary] Cardiovascular metrics after grouping:`, cardiovascular.map(m => `${m.metric} (normalized: ${normalizeMetricName(m.metric)})`))
  
  // Helper to format table row
  const formatRow = (metric: ReportMetric) => ({
    metric: metric.metric,
    value: metric.result_display,
    referenceRange: metric.reference_display,
    flag: computeFlag(metric.metric, metric.result_display, metric.reference_display),
  })
  
  // Combine Deep/Light/REM sleep % and duration
  const processSleepMetrics = (sleepMetrics: ReportMetric[]) => {
    const result: Array<{ metric: string; value: string; referenceRange: string; flag: string }> = []
    const processed = new Set<string>()
    
    // Process in order: Time in Bed, Sleep Duration
    const orderedMetrics = ['time in bed', 'sleep duration']
    for (const orderName of orderedMetrics) {
      const metric = sleepMetrics.find(m => normalizeMetricName(m.metric) === orderName)
      if (metric) {
        // Time in Bed must NEVER have flags
        if (normalizeMetricName(metric.metric).includes('time in bed')) {
          result.push({
            metric: metric.metric,
            value: metric.result_display,
            referenceRange: metric.reference_display,
            flag: '', // Always blank for Time in Bed
          })
        } else {
          result.push(formatRow(metric))
        }
        processed.add(normalizeMetricName(metric.metric))
      }
    }
    
    // Combine Deep/Light/REM sleep
    const deepPct = sleepMetrics.find(m => {
      const n = normalizeMetricName(m.metric)
      return n.includes('deep') && (n.includes('%') || n.includes('percentage'))
    })
    const deepDur = sleepMetrics.find(m => {
      const n = normalizeMetricName(m.metric)
      return n.includes('deep') && n.includes('duration')
    })
    
    if (deepPct || deepDur) {
      const pct = deepPct?.result_display || '—'
      const dur = deepDur?.result_display || '—'
      const value = dur !== '—' ? `${pct} (${dur})` : pct
      const refRange = deepPct?.reference_display || deepDur?.reference_display || '—'
      // Compute flag for Deep Sleep based on percentage value
      let flag = ''
      if (deepPct && refRange !== '—') {
        const pctNum = parseResultValue(deepPct.result_display)
        const ref = parseReferenceRange(refRange)
        if (pctNum !== null && ref !== null && (pctNum < ref.lower || pctNum > ref.upper)) {
          flag = '🟥'
        }
      }
      result.push({
        metric: 'Deep Sleep',
        value,
        referenceRange: refRange,
        flag: flag,
      })
      if (deepPct) processed.add(normalizeMetricName(deepPct.metric))
      if (deepDur) processed.add(normalizeMetricName(deepDur.metric))
    }
    
    // Same for Light and REM
    const lightPct = sleepMetrics.find(m => {
      const n = normalizeMetricName(m.metric)
      return n.includes('light') && (n.includes('%') || n.includes('percentage'))
    })
    const lightDur = sleepMetrics.find(m => {
      const n = normalizeMetricName(m.metric)
      return n.includes('light') && n.includes('duration')
    })
    
    if (lightPct || lightDur) {
      const pct = lightPct?.result_display || '—'
      const dur = lightDur?.result_display || '—'
      const value = dur !== '—' ? `${pct} (${dur})` : pct
      const refRange = lightPct?.reference_display || lightDur?.reference_display || '—'
      // Compute flag for Light Sleep based on percentage value
      let flag = ''
      if (lightPct && refRange !== '—') {
        const pctNum = parseResultValue(lightPct.result_display)
        const ref = parseReferenceRange(refRange)
        if (pctNum !== null && ref !== null && (pctNum < ref.lower || pctNum > ref.upper)) {
          flag = '🟥'
        }
      }
      result.push({
        metric: 'Light Sleep',
        value,
        referenceRange: refRange,
        flag: flag,
      })
      if (lightPct) processed.add(normalizeMetricName(lightPct.metric))
      if (lightDur) processed.add(normalizeMetricName(lightDur.metric))
    }
    
    const remPct = sleepMetrics.find(m => {
      const n = normalizeMetricName(m.metric)
      return n.includes('rem') && (n.includes('%') || n.includes('percentage'))
    })
    const remDur = sleepMetrics.find(m => {
      const n = normalizeMetricName(m.metric)
      return n.includes('rem') && n.includes('duration')
    })
    
    if (remPct || remDur) {
      const pct = remPct?.result_display || '—'
      const dur = remDur?.result_display || '—'
      const value = dur !== '—' ? `${pct} (${dur})` : pct
      const refRange = remPct?.reference_display || remDur?.reference_display || '—'
      // Compute flag for REM Sleep based on percentage value
      let flag = ''
      if (remPct && refRange !== '—') {
        const pctNum = parseResultValue(remPct.result_display)
        const ref = parseReferenceRange(refRange)
        if (pctNum !== null && ref !== null && (pctNum < ref.lower || pctNum > ref.upper)) {
          flag = '🟥'
        }
      }
      result.push({
        metric: 'REM Sleep',
        value,
        referenceRange: refRange,
        flag: flag,
      })
      if (remPct) processed.add(normalizeMetricName(remPct.metric))
      if (remDur) processed.add(normalizeMetricName(remDur.metric))
    }
    
    return result
  }
  
  // Format cardiovascular & oxygenation - Metric | Value (with unit) | Reference Range | Flag
  const formatCardiovascular = (metrics: ReportMetric[]): Array<{ metric: string; value: string; referenceRange: string; flag: string }> => {
    const result: Array<{ metric: string; value: string; referenceRange: string; flag: string }> = []
    
    // Define metric order and mapping
    const metricOrder = [
      { 
        keys: ['resting heart rate', 'resting hr', 'readiness resting heart rate'],
        name: 'Resting Heart Rate'
      },
      { 
        keys: ['lowest night-time heart rate', 'sleep lowest heart rate'],
        name: 'Lowest Night-time Heart Rate'
      },
      { 
        keys: ['night-time hrv', 'sleep average hrv', 'readiness hrv balance'],
        name: 'Night-time HRV'
      },
      { 
        keys: [
          'average nightly spo2',
          'average nightly sp', 
          'spo2 percentage average', 
          'oxygen saturation', 
          'spo2',
          'sp'
        ],
        name: 'Oxygen Saturation (SpO2)'
      },
      { 
        keys: ['breathing disturbance index', 'breathing disturbance', 'bdi'],
        name: 'Breathing Disturbance Index'
      },
      { 
        keys: ['temperature deviation', 'readiness temperature deviation'],
        name: 'Temperature Deviation'
      },
    ]
    
    console.log(`[DoctorSummary] formatCardiovascular - Input metrics:`, metrics.map(m => `${m.metric} (normalized: ${normalizeMetricName(m.metric)})`))
    
    for (const metricDef of metricOrder) {
      // Find the first matching metric
      const found = metrics.find(m => {
        const normalized = normalizeMetricName(m.metric)
        // More robust matching: check if any key matches the normalized metric name
        return metricDef.keys.some(key => {
          const normalizedKey = key.toLowerCase().trim()
          // Try exact match first
          if (normalized === normalizedKey) return true
          // Try substring match in both directions
          if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) return true
          // Special handling for SpO2 variations (case-insensitive)
          if (normalizedKey.includes('spo2') || normalizedKey.includes('sp')) {
            const normalizedWithoutSpaces = normalized.replace(/\s+/g, ' ')
            const keyWithoutSpaces = normalizedKey.replace(/\s+/g, ' ')
            if (normalizedWithoutSpaces.includes(keyWithoutSpaces) || keyWithoutSpaces.includes(normalizedWithoutSpaces)) {
              return true
            }
          }
          return false
        })
      })
      
      if (found) {
        // Use the result_display as-is (it already includes units)
        // Compute flag only for metrics that are allowed to have flags
        const flag = computeFlag(found.metric, found.result_display, found.reference_display)
        
        result.push({
          metric: metricDef.name,
          value: found.result_display,
          referenceRange: found.reference_display,
          flag: flag
        })
      } else {
        // Enhanced debug logging for SpO2
        if (metricDef.name === 'Oxygen Saturation (SpO2)') {
          console.log(`[DoctorSummary] ${metricDef.name} NOT FOUND. Looking for keys:`, metricDef.keys)
          console.log(`[DoctorSummary] Available cardiovascular metrics:`, metrics.map(m => {
            const n = normalizeMetricName(m.metric)
            return `${m.metric} (normalized: "${n}")`
          }))
          // Check if any metric contains "spo2" or "oxygen"
          const spo2Candidates = metrics.filter(m => {
            const n = normalizeMetricName(m.metric)
            return n.includes('spo2') || n.includes('oxygen') || n.includes('sp')
          })
          if (spo2Candidates.length > 0) {
            console.log(`[DoctorSummary] Found potential SpO2 candidates:`, spo2Candidates.map(m => `${m.metric} (normalized: "${normalizeMetricName(m.metric)}")`))
          } else {
            console.log(`[DoctorSummary] No SpO2 candidates found in cardiovascular metrics`)
          }
        } else if (metricDef.keys.some(k => k.includes('breathing') || k.includes('disturbance'))) {
          console.log(`[DoctorSummary] ${metricDef.name} NOT FOUND. Looking for keys:`, metricDef.keys)
          console.log(`[DoctorSummary] Available cardiovascular metrics:`, metrics.map(m => `${m.metric} (normalized: ${normalizeMetricName(m.metric)})`))
        }
      }
    }
    
    return result
  }
  
  // Format activity
  const formatActivity = (metrics: ReportMetric[]) => {
    return metrics.map(m => formatRow(m))
  }
  
  return {
    sleepTable: processSleepMetrics(sleep),
    cardiovascularTable: formatCardiovascular(cardiovascular),
    activityTable: formatActivity(activity),
  }
}
