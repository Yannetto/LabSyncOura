import type { ReportMetric } from './calculations'

export interface DoctorSummary {
  sleepTable: Array<{
    metric: string
    value: string
    referenceRange: string
    clinicalRange?: string
    flag: string
  }>
  cardiovascularTable: Array<{
    metric: string
    value: string
    referenceRange: string
    clinicalRange?: string
    flag: string
  }>
  activityTable: Array<{
    metric: string
    value: string
    referenceRange: string
    clinicalRange?: string
    flag: string
  }>
}

export interface ReportMetadata {
  patientEmail: string
  reportDate: string
  dataPeriod: {
    start: string
    end: string
    days: number
  }
  referenceRange: {
    start: string
    end: string
    days: number
  }
  dataQuality?: {
    completeness: number
    daysCollected: number
    quality: 'Good' | 'Fair' | 'Poor'
  }
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
  
  // Try to parse duration strings like "7h 30m" or "3 min" to minutes
  const parseDuration = (str: string): number | null => {
    // Handle "3 min" format (standalone minutes)
    const minMatch = str.match(/(\d+)\s*min(?!\w)/) // Match "min" but not "minutes" or "minute"
    if (minMatch) {
      return parseInt(minMatch[1])
    }
    
    // Handle "7h 30m" format (hours and minutes)
    const hMatch = str.match(/(\d+)\s*h/)
    const mMatch = str.match(/(\d+)\s*m(?!s)/) // Match "m" but not "ms"
    const hours = hMatch ? parseInt(hMatch[1]) : 0
    const minutes = mMatch ? parseInt(mMatch[1]) : 0
    
    // Only return if we found at least one component
    if (hours > 0 || minutes > 0) {
      return hours * 60 + minutes
    }
    
    return null
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
  
  // Try duration parsing (e.g., "7h 30m" or "3 min" -> minutes)
  // Handle "3 min" format first (standalone minutes)
  const minMatch = result.match(/(\d+)\s*min(?!\w)/) // Match "min" but not "minutes" or "minute"
  if (minMatch) {
    return parseInt(minMatch[1])
  }
  
  // Handle "7h 30m" format (hours and minutes)
  const hMatch = result.match(/(\d+)\s*h/)
  const mMatch = result.match(/(\d+)\s*m(?!s)/) // Match "m" but not "ms"
  if (hMatch || mMatch) {
    const hours = hMatch ? parseInt(hMatch[1]) : 0
    const minutes = mMatch ? parseInt(mMatch[1]) : 0
    // Only return if we found at least one component
    if (hours > 0 || minutes > 0) {
      return hours * 60 + minutes
    }
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
 * Returns "Above Range" or "Below Range" for out-of-range values
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
  
  // Handle zero ranges (e.g., "0 min – 0 min")
  if (refRange.lower === 0 && refRange.upper === 0) {
    if (resultNum > 0) {
      return 'Above Range'
    }
    return '' // Zero result with zero range = no flag
  }
  
  // Validate range is sensible
  if (refRange.lower > refRange.upper) {
    console.warn(`[DoctorSummary] Invalid reference range for ${metricName}: ${refRange.lower} > ${refRange.upper}`)
    return ''
  }
  
  // Return specific text for above or below range
  if (resultNum > refRange.upper) {
    // Log suspicious flagging for debugging
    if (resultNum > refRange.upper * 2) {
      console.warn(`[DoctorSummary] Large deviation for ${metricName}: ${resultNum} vs range ${refRange.lower}–${refRange.upper}`)
    }
    return 'Above Range'
  }
  if (resultNum < refRange.lower) {
    // Log suspicious flagging for debugging
    if (resultNum < refRange.lower / 2) {
      console.warn(`[DoctorSummary] Large deviation for ${metricName}: ${resultNum} vs range ${refRange.lower}–${refRange.upper}`)
    }
    return 'Below Range'
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
    'sleep total sleep duration', // From sleep_total_sleep_duration_seconds
    'deep sleep %',
    'deep sleep percentage',
    'deep sleep duration',
    'deep sleep', // Generic match
    'light sleep %',
    'light sleep percentage',
    'light sleep duration',
    'light sleep', // Generic match
    'rem sleep %',
    'rem sleep percentage',
    'rem sleep duration',
    'rem sleep', // Generic match
    'sleep latency',
    'sleep efficiency',
    'sleep debt', // Sleep debt calculation
  ],
  cardiovascular: [
    'resting heart rate',
    'resting hr',
    'readiness resting heart rate', // From readiness_resting_heart_rate
    'lowest night-time heart rate',
    'sleep lowest heart rate', // From sleep_lowest_heart_rate
    'night-time hrv',
    'hrv', // Generic match for HRV metrics
    'hrv rmssd', // From hrv_rmssd
    'readiness hrv balance', // This will be renamed to "Night-time HRV"
    'readiness hrv rmssd', // From readiness_hrv_rmssd
    'sleep average hrv', // From sleep_average_hrv
    'respiratory rate',
    'sleep respiratory rate', // From sleep_respiratory_rate
    'average nightly spo2', // From spo2_percentage_average
    'spo2 percentage average',
    'oxygen saturation',
    'spo2',
    'breathing disturbance index',
    'temperature deviation',
    'readiness temperature deviation', // From readiness_temperature_deviation
    'temperature trend deviation',
    'readiness temperature trend deviation', // From readiness_temperature_trend_deviation
    'recovery high', // Time in high recovery zone
  ],
  activity: [
    'steps',
    'sedentary time',
    'sedentary time seconds', // From sedentary_time_seconds
    'active calories',
    'total calories',
    'high activity time',
    'high activity time seconds',
    'medium activity time',
    'medium activity time seconds',
    'low activity time',
    'low activity time seconds',
    'resting time',
    'resting time seconds',
  ],
}

/**
 * Metrics that CAN have flags (computed from reference range)
 * All other metrics must have blank flags
 */
const METRICS_WITH_FLAGS = new Set([
  'sleep duration',
  'sleep latency',
  'sleep efficiency',
  'sleep debt', // Sleep debt can be flagged
  'resting heart rate',
  'resting hr',
  'lowest night-time heart rate',
  'sleep lowest heart rate',
  'night-time hrv',
  'readiness hrv balance',
  'sleep average hrv',
  'respiratory rate',
  'sleep respiratory rate',
  'oxygen saturation',
  'spo2',
  'average nightly spo2',
  'spo2 percentage average',
  'breathing disturbance index',
  'temperature deviation',
  'readiness temperature deviation',
  'temperature trend deviation',
  'readiness temperature trend deviation',
  'recovery high',
  'steps',
  'sedentary time',
  'active calories',
  'total calories',
  'high activity time',
  'medium activity time',
  'low activity time',
  'resting time',
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
    // Special handling for SpO2: match "average nightly spo2" variations
    if ((normalized.includes('average nightly') && normalized.includes('spo2')) ||
        (metric.includes('average nightly') && metric.includes('spo2'))) {
      if (normalized.includes('spo2') && metric.includes('spo2')) {
        return { keep: true, category: 'cardiovascular' }
      }
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
  // Debug: Log all incoming metrics (especially new ones we added)
  const newMetrics = metrics.filter(m => {
    const n = normalizeMetricName(m.metric)
    return n.includes('recovery high') || n.includes('temperature trend') || 
           n.includes('active calories') || n.includes('total calories') ||
           n.includes('activity time') || n.includes('sleep latency') ||
           n.includes('sleep efficiency') || n.includes('spo2') || 
           n.includes('breathing') || n.includes('disturbance') ||
           n.includes('respiratory')
  })
  
  // Debug: Log all SpO2 metrics specifically
  const spo2Metrics = metrics.filter(m => {
    const n = normalizeMetricName(m.metric)
    return n.includes('spo2') || n.includes('oxygen saturation')
  })
  if (spo2Metrics.length > 0) {
    console.log(`[DoctorSummary] SpO2 metrics found in input:`, spo2Metrics.map(m => 
      `${m.metric} (normalized: ${normalizeMetricName(m.metric)}, value: ${m.result_display})`
    ))
  } else {
    console.log(`[DoctorSummary] NO SpO2 metrics found in input. Total metrics: ${metrics.length}`)
  }
  if (newMetrics.length > 0) {
    console.log(`[DoctorSummary] New metrics found in input:`, newMetrics.map(m => 
      `${m.metric} (normalized: ${normalizeMetricName(m.metric)}, value: ${m.result_display})`
    ))
  } else {
    console.log(`[DoctorSummary] NO new metrics in input. Total metrics:`, metrics.length)
    console.log(`[DoctorSummary] Sample metric names:`, metrics.slice(0, 15).map(m => m.metric))
  }
  
  // Step 1: Filter to keep only specified metrics
  const filtered = metrics.filter(m => {
    const { keep } = shouldKeepMetric(m.metric)
    if (!keep) {
      // Only log if it's a metric we're interested in (to reduce noise)
      const normalized = normalizeMetricName(m.metric)
      if (normalized.includes('recovery') || normalized.includes('temperature trend') || 
          normalized.includes('active calories') || normalized.includes('total calories') ||
          normalized.includes('activity time') || normalized.includes('sleep latency') ||
          normalized.includes('sleep efficiency')) {
        console.log(`[DoctorSummary] Filtered out metric: "${m.metric}" (normalized: "${normalized}")`)
      }
    }
    return keep
  })
  
  console.log(`[DoctorSummary] After filtering: ${filtered.length} metrics kept out of ${metrics.length} total`)
  if (filtered.length === 0 && metrics.length > 0) {
    console.error(`[DoctorSummary] ERROR: All metrics were filtered out! This suggests a matching issue.`)
    console.log(`[DoctorSummary] Sample filtered metrics:`, metrics.slice(0, 10).map(m => ({
      metric: m.metric,
      normalized: normalizeMetricName(m.metric)
    })))
  }
  
  const spo2Filtered = filtered.filter(m => {
    const n = normalizeMetricName(m.metric)
    return n.includes('spo2') || n.includes('breathing') || n.includes('disturbance')
  })
  const spo2InNewMetrics = newMetrics.filter(m => {
    const n = normalizeMetricName(m.metric)
    return n.includes('spo2') || n.includes('breathing') || n.includes('disturbance')
  })
  if (spo2Filtered.length > 0) {
    console.log(`[DoctorSummary] SpO2/Breathing metrics after filtering:`, spo2Filtered.map(m => m.metric))
  } else if (spo2InNewMetrics.length > 0) {
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
    clinicalRange: metric.clinical_range,
    flag: computeFlag(metric.metric, metric.result_display, metric.reference_display),
  })
  
  // Combine Deep/Light/REM sleep % and duration
  const processSleepMetrics = (sleepMetrics: ReportMetric[]) => {
    const result: Array<{ metric: string; value: string; referenceRange: string; flag: string }> = []
    const processed = new Set<string>()
    
    // Process in order: Time in Bed, Sleep Duration, Sleep Latency, Sleep Efficiency, Sleep Debt
    const orderedMetrics = ['time in bed', 'sleep duration', 'sleep latency', 'sleep efficiency', 'sleep debt']
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
    
    // Combine Deep/REM/Light sleep in logical order: Deep Sleep, REM Sleep, Light Sleep
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
        if (pctNum !== null && ref !== null) {
          if (pctNum > ref.upper) flag = 'Above Range'
          else if (pctNum < ref.lower) flag = 'Below Range'
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
    
    // REM Sleep (second)
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
        if (pctNum !== null && ref !== null) {
          if (pctNum > ref.upper) flag = 'Above Range'
          else if (pctNum < ref.lower) flag = 'Below Range'
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
    
    // Light Sleep (last)
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
        if (pctNum !== null && ref !== null) {
          if (pctNum > ref.upper) flag = 'Above Range'
          else if (pctNum < ref.lower) flag = 'Below Range'
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
        keys: ['respiratory rate', 'sleep respiratory rate'],
        name: 'Respiratory Rate'
      },
      { 
        keys: [
          'average nightly spo2',
          'spo2 percentage average', 
          'oxygen saturation', 
          'spo2'
        ],
        name: 'Oxygen Saturation (SpO2)'
      },
      { 
        keys: ['breathing disturbance index', 'breathing disturbance', 'bdi'],
        name: 'Breathing Disturbance Index'
      },
      { 
        keys: ['temperature trend deviation', 'readiness temperature trend deviation'],
        name: 'Temperature Trend Deviation'
      },
      { 
        keys: ['recovery high'],
        name: 'Recovery High'
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
          
          // Special handling for SpO2: match "average nightly spo2" variations more flexibly
          if ((normalized.includes('average nightly') && normalized.includes('spo2')) &&
              (normalizedKey.includes('average nightly') && normalizedKey.includes('spo2'))) {
            return true
          }
          
          // Special handling for SpO2 variations (must contain "spo2" or "oxygen saturation")
          if ((normalizedKey.includes('spo2') || normalizedKey.includes('oxygen saturation')) &&
              (normalized.includes('spo2') || normalized.includes('oxygen saturation'))) {
            return true
          }
          
          // Try substring match in both directions (but be careful with "sp" to avoid matching "respiratory")
          // Only do substring match if it's not a generic "sp" that could match "respiratory"
          if (normalizedKey.length > 2 && normalizedKey !== 'sp') {
            if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) return true
          }
          
          // Allow "sp" to match only if normalized contains "spo2" (not "respiratory")
          if (normalizedKey === 'sp' && normalized.includes('spo2')) {
            return true
          }
          return false
        })
      })
      
      if (found) {
        // Skip metrics with zero ranges (e.g., "0 min – 0 min")
        const refRange = parseReferenceRange(found.reference_display)
        if (refRange && refRange.lower === 0 && refRange.upper === 0) {
          const resultNum = parseResultValue(found.result_display)
          // Only skip if result is also zero
          if (resultNum === 0 || resultNum === null) {
            continue // Skip this metric
          }
        }
        
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
          // Check if any metric contains "spo2" or "oxygen saturation"
          const spo2Candidates = metrics.filter(m => {
            const n = normalizeMetricName(m.metric)
            return n.includes('spo2') || n.includes('oxygen saturation')
          })
          if (spo2Candidates.length > 0) {
            console.log(`[DoctorSummary] Found potential SpO2 candidates:`, spo2Candidates.map(m => `${m.metric} (normalized: "${normalizeMetricName(m.metric)}", value: ${m.result_display})`))
            // Try to match each candidate
            for (const candidate of spo2Candidates) {
              const n = normalizeMetricName(candidate.metric)
              console.log(`[DoctorSummary] Testing candidate "${candidate.metric}" (normalized: "${n}") against keys:`, metricDef.keys)
              for (const key of metricDef.keys) {
                const normalizedKey = key.toLowerCase().trim()
                const exactMatch = n === normalizedKey
                const substringMatch = normalizedKey.length > 2 && normalizedKey !== 'sp' && (n.includes(normalizedKey) || normalizedKey.includes(n))
                const spo2Match = (normalizedKey.includes('spo2') || normalizedKey.includes('oxygen saturation')) && 
                                  (n.includes('spo2') || n.includes('oxygen saturation'))
                console.log(`[DoctorSummary]   Key "${key}" (normalized: "${normalizedKey}"): exact=${exactMatch}, substring=${substringMatch}, spo2=${spo2Match}`)
              }
            }
          } else {
            console.log(`[DoctorSummary] No SpO2 candidates found in cardiovascular metrics`)
          }
        } else if (metricDef.name === 'Recovery High') {
          console.log(`[DoctorSummary] ${metricDef.name} NOT FOUND. Looking for keys:`, metricDef.keys)
          console.log(`[DoctorSummary] Available cardiovascular metrics:`, metrics.map(m => {
            const n = normalizeMetricName(m.metric)
            return `${m.metric} (normalized: "${n}")`
          }))
          const recoveryCandidates = metrics.filter(m => {
            const n = normalizeMetricName(m.metric)
            return n.includes('recovery')
          })
          if (recoveryCandidates.length > 0) {
            console.log(`[DoctorSummary] Found potential Recovery High candidates:`, recoveryCandidates.map(m => `${m.metric} (normalized: "${normalizeMetricName(m.metric)}")`))
          }
        } else if (metricDef.keys.some(k => k.includes('breathing') || k.includes('disturbance'))) {
          console.log(`[DoctorSummary] ${metricDef.name} NOT FOUND. Looking for keys:`, metricDef.keys)
          console.log(`[DoctorSummary] Available cardiovascular metrics:`, metrics.map(m => `${m.metric} (normalized: ${normalizeMetricName(m.metric)})`))
        }
      }
    }
    
    return result
  }
  
  // Format activity - with specific ordering
  const formatActivity = (metrics: ReportMetric[]) => {
    const result: Array<{ metric: string; value: string; referenceRange: string; flag: string }> = []
    
    // Define metric order
    const metricOrder = [
      { 
        keys: ['steps'],
        name: 'Steps'
      },
      { 
        keys: ['active calories'],
        name: 'Active Calories'
      },
      { 
        keys: ['total calories'],
        name: 'Total Calories'
      },
      { 
        keys: ['sedentary time', 'sedentary time seconds'],
        name: 'Sedentary Time'
      },
      { 
        keys: ['high activity time', 'high activity time seconds'],
        name: 'High Activity Time'
      },
      { 
        keys: ['medium activity time', 'medium activity time seconds'],
        name: 'Medium Activity Time'
      },
      { 
        keys: ['low activity time', 'low activity time seconds'],
        name: 'Low Activity Time'
      },
      { 
        keys: ['resting time', 'resting time seconds'],
        name: 'Resting Time'
      },
    ]
    
    for (const metricDef of metricOrder) {
      const found = metrics.find(m => {
        const normalized = normalizeMetricName(m.metric)
        return metricDef.keys.some(key => {
          const normalizedKey = key.toLowerCase().trim()
          return normalized === normalizedKey || normalized.includes(normalizedKey) || normalizedKey.includes(normalized)
        })
      })
      
      if (found) {
        // Skip metrics with zero ranges (e.g., "0 min – 0 min")
        const refRange = parseReferenceRange(found.reference_display)
        if (refRange && refRange.lower === 0 && refRange.upper === 0) {
          const resultNum = parseResultValue(found.result_display)
          // Only skip if result is also zero
          if (resultNum === 0 || resultNum === null) {
            continue // Skip this metric
          }
        }
        
        // Validate total calories >= active calories
        if (metricDef.name === 'Total Calories') {
          const totalCal = parseResultValue(found.result_display)
          // Find active calories for comparison
          const activeCalMetric = metrics.find(m => {
            const normalized = normalizeMetricName(m.metric)
            return normalized.includes('active calories')
          })
          if (activeCalMetric && totalCal !== null) {
            const activeCal = parseResultValue(activeCalMetric.result_display)
            if (activeCal !== null && totalCal < activeCal) {
              console.warn(`[DoctorSummary] Total calories (${totalCal}) is less than active calories (${activeCal}) - data quality issue`)
            }
          }
        }
        
        const flag = computeFlag(found.metric, found.result_display, found.reference_display)
        result.push({
          metric: metricDef.name,
          value: found.result_display,
          referenceRange: found.reference_display,
          flag: flag
        })
      }
    }
    
    return result
  }
  
  return {
    sleepTable: processSleepMetrics(sleep),
    cardiovascularTable: formatCardiovascular(cardiovascular),
    activityTable: formatActivity(activity),
  }
}
