import { getClinicalRange, formatClinicalRange } from './clinical-ranges'

interface DailyMetric {
  day: string
  metric_key: string
  value: string
}

export interface ReportMetric {
  metric: string
  result_display: string
  flag: 'Normal' | 'Borderline' | 'Low' | 'High'
  reference_display: string
  clinical_range?: string
}

export interface DataQuality {
  completeness: number // Percentage
  daysCollected: number
  quality: 'Good' | 'Fair' | 'Poor'
}

function parseValue(value: string | null): number | null {
  if (!value) return null
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.floor((percentile / 100) * sorted.length)
  return sorted[index] || 0
}

function calculateIQR(values: number[]): { q25: number; q75: number } {
  return {
    q25: calculatePercentile(values, 25),
    q75: calculatePercentile(values, 75),
  }
}

function getFlag(
  result: number,
  q25: number,
  q75: number
): 'Normal' | 'Borderline' | 'Low' | 'High' {
  // Handle edge case where q25 == q75 (no variation)
  if (q25 === q75) {
    if (result < q25) return 'Low'
    if (result > q25) return 'High'
    return 'Normal'
  }

  const range = q75 - q25
  const lowerBound = q25 - range * 0.1
  const upperBound = q75 + range * 0.1

  // Check Low first (most extreme)
  if (result <= lowerBound) return 'Low'
  // Check High second (most extreme)
  if (result >= upperBound) return 'High'
  // Check Borderline (outside normal range but not extreme)
  if (result < q25 || result > q75) return 'Borderline'
  // Normal (within q25-q75)
  return 'Normal'
}

// Formatting helper functions
function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    // Less than 1 hour, show as minutes
    const minutes = Math.round(seconds / 60)
    return `${minutes} min`
  } else {
    // 1 hour or more, show as hours and minutes
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

function formatCount(value: number, label: string): string {
  return `${value} / ${label}`
}

function formatReferenceDuration(q25: number, q75: number): string {
  const q25Formatted = formatDuration(q25)
  const q75Formatted = formatDuration(q75)
  return `${q25Formatted} – ${q75Formatted}`
}

function formatTemperature(celsius: number): string {
  const fahrenheit = (celsius * 9/5) + 32
  return `${celsius.toFixed(2)}°C (${fahrenheit.toFixed(2)}°F)`
}

function formatTemperatureRange(q25: number, q75: number): string {
  const q25F = (q25 * 9/5) + 32
  const q75F = (q75 * 9/5) + 32
  return `${q25.toFixed(2)}–${q75.toFixed(2)}°C (${q25F.toFixed(2)}–${q75F.toFixed(2)}°F)`
}

// Temperature deviations (anomalies) do NOT add 32 - only multiply by 9/5
function formatTemperatureDeviation(celsius: number): string {
  const fahrenheit = celsius * 9/5
  return `${celsius.toFixed(2)}°C (${fahrenheit.toFixed(2)}°F)`
}

function formatTemperatureDeviationRange(q25: number, q75: number): string {
  const q25F = q25 * 9/5
  const q75F = q75 * 9/5
  return `${q25.toFixed(2)}–${q75.toFixed(2)}°C (${q25F.toFixed(2)}–${q75F.toFixed(2)}°F)`
}

// Helper function to calculate a metric with flexible reference data
// Returns metric with "—" if data is missing (never returns null)
function calculateMetric(
  metric7d: number[],
  metricRef: number[],
  metricName: string,
  formatResult: (value: number) => string,
  formatReference: (q25: number, q75: number) => string,
  age?: number | null,
  gender?: string | null
): ReportMetric {
  // Get clinical range
  const clinicalRange = getClinicalRange(metricName, age, gender)
  const clinicalRangeDisplay = formatClinicalRange(clinicalRange)
  
  // If no 7-day data, show "—" for result
  if (metric7d.length === 0) {
    console.log(`[Report] No 7-day data for ${metricName}`)
    return {
      metric: metricName,
      result_display: '—',
      flag: 'Normal',
      reference_display: metricRef.length > 0 
        ? formatReference(
            Math.min(...metricRef), 
            Math.max(...metricRef)
          )
        : '—',
      clinical_range: clinicalRangeDisplay,
    }
  }
  
  console.log(`[Report] ${metricName} - 7d values:`, metric7d, 'avg:', metric7d.reduce((a, b) => a + b, 0) / metric7d.length)

  const avg7d = metric7d.reduce((a, b) => a + b, 0) / metric7d.length

  if (metricRef.length >= 3) {
    // Enough data for IQR calculation (30-day reference range)
    const iqr = calculateIQR(metricRef)
    return {
      metric: metricName,
      result_display: formatResult(avg7d),
      flag: getFlag(avg7d, iqr.q25, iqr.q75),
      reference_display: formatReference(iqr.q25, iqr.q75),
      clinical_range: clinicalRangeDisplay,
    }
  } else if (metricRef.length > 0) {
    // Some reference data, use min-max
    const min = Math.min(...metricRef)
    const max = Math.max(...metricRef)
    return {
      metric: metricName,
      result_display: formatResult(avg7d),
      flag: 'Normal', // Can't determine flag without enough data
      reference_display: formatReference(min, max),
      clinical_range: clinicalRangeDisplay,
    }
  } else {
    // No reference data, but show the 7-day result
    return {
      metric: metricName,
      result_display: formatResult(avg7d),
      flag: 'Normal',
      reference_display: '—',
      clinical_range: clinicalRangeDisplay,
    }
  }
}

/**
 * Calculate data quality metrics
 */
export function calculateDataQuality(
  dailyData: DailyMetric[],
  reportPeriodDays: number = 7,
  referencePeriodDays: number = 30
): DataQuality {
  const uniqueDays = new Set(dailyData.map(d => d.day)).size
  const expectedDays = reportPeriodDays + referencePeriodDays
  const completeness = (uniqueDays / expectedDays) * 100
  
  let quality: 'Good' | 'Fair' | 'Poor'
  if (completeness >= 80) {
    quality = 'Good'
  } else if (completeness >= 50) {
    quality = 'Fair'
  } else {
    quality = 'Poor'
  }
  
  return {
    completeness: Math.round(completeness),
    daysCollected: uniqueDays,
    quality
  }
}

export function calculateReportMetrics(
  dailyData: DailyMetric[],
  age?: number | null,
  gender?: string | null
): ReportMetric[] {
  // Debug: Log incoming data
  console.log('[Report] Total dailyData records:', dailyData.length)
  if (dailyData.length > 0) {
    console.log('[Report] Sample record:', dailyData[0])
    console.log('[Report] Unique days:', [...new Set(dailyData.map(d => d.day))].sort().slice(0, 10))
    const allMetricKeys = [...new Set(dailyData.map(d => d.metric_key))].sort()
    console.log('[Report] ALL Unique metric_keys in database:', allMetricKeys)
    console.log('[Report] Looking for sleep_duration, found:', allMetricKeys.includes('sleep_duration'))
    console.log('[Report] Looking for steps, found:', allMetricKeys.includes('steps'))
    
    // Show count of each metric key
    const metricKeyCounts: { [key: string]: number } = {}
    dailyData.forEach(d => {
      metricKeyCounts[d.metric_key] = (metricKeyCounts[d.metric_key] || 0) + 1
    })
    console.log('[Report] Metric key counts:', metricKeyCounts)
    console.log('[Report] Looking for sleep metrics - checking if any sleep-related keys exist:')
    const sleepRelatedKeys = allMetricKeys.filter(k => k.toLowerCase().includes('sleep'))
    console.log('[Report] Sleep-related keys found:', sleepRelatedKeys)
    const hrRelatedKeys = allMetricKeys.filter(k => k.toLowerCase().includes('heart') || k.toLowerCase().includes('hrv') || k.toLowerCase().includes('hr'))
    console.log('[Report] Heart/HRV-related keys found:', hrRelatedKeys)
  }

  const now = new Date()
  // Set to start of today (no time component)
  now.setHours(0, 0, 0, 0)
  
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const metrics: ReportMetric[] = []

  // Helper to normalize date string to YYYY-MM-DD format
  const normalizeDate = (dateStr: string | Date): string => {
    if (typeof dateStr === 'string') {
      // Handle various date string formats
      const normalized = dateStr.split('T')[0] // Extract YYYY-MM-DD part
      return normalized
    }
    // If it's a Date object, convert to YYYY-MM-DD
    const year = dateStr.getFullYear()
    const month = String(dateStr.getMonth() + 1).padStart(2, '0')
    const day = String(dateStr.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Helper to filter data by date range (using string comparison)
  const filterByDateRange = (start: Date, end: Date) => {
    const startStr = normalizeDate(start)
    const endStr = normalizeDate(end)
    
    const filtered = dailyData.filter((d) => {
      const dayStr = normalizeDate(d.day)
      return dayStr >= startStr && dayStr <= endStr
    })
    
    console.log(`[Report] Filtered ${filtered.length} records for range ${startStr} to ${endStr}`)
    return filtered
  }

  // Get last 7 days for result calculation (excluding today)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  let last7Days = filterByDateRange(sevenDaysAgo, yesterday)
  console.log(`[Report] Last 7 days (excluding today): ${normalizeDate(sevenDaysAgo)} to ${normalizeDate(yesterday)}`)
  console.log(`[Report] Found ${last7Days.length} records in last 7 days`)
  
  // If no data in last 7 days, use all available data (except today) as fallback
  // This handles cases where user has data but it's older than 7 days
  if (last7Days.length === 0) {
    console.log(`[Report] No data in last 7 days, using all available data (except today) as fallback`)
    last7Days = dailyData.filter((d) => {
      const dayStr = normalizeDate(d.day)
      const yesterdayStr = normalizeDate(yesterday)
      return dayStr <= yesterdayStr
    })
    console.log(`[Report] Using ${last7Days.length} records from all available data`)
  }
  
  // Get reference data: use all available data before the 7-day period
  // This is more flexible than requiring exactly 30 days
  const referenceData = dailyData.filter((d) => {
    const dayStr = normalizeDate(d.day)
    const sevenDaysAgoStr = normalizeDate(sevenDaysAgo)
    return dayStr < sevenDaysAgoStr // All data before the 7-day period
  })
  
  console.log(`[Report] Reference data (before 7-day period): ${referenceData.length} records`)
  
  // If we have less than 7 days of reference data, use all available data
  // (but still separate 7-day from reference)
  const finalReferenceData = referenceData.length >= 7 
    ? referenceData 
    : dailyData.filter((d) => {
        const dayStr = normalizeDate(d.day)
        const yesterdayStr = normalizeDate(yesterday)
        return dayStr <= yesterdayStr // Use all data except today
      })
  
  console.log(`[Report] Final reference data: ${finalReferenceData.length} records`)
  
  // Helper to clean respiratory rate values (fix incorrectly stored data)
  // If value is > 60, it's likely incorrectly stored (e.g., breaths/sec * 60 or some other error)
  // Divide by 60 to get back to breaths/minute
  // Returns null if value is implausible even after correction
  const cleanRespiratoryRate = (value: number): number | null => {
    let correctedValue = value
    
    if (value > 60) {
      correctedValue = value / 60
      console.warn(`[Report] Respiratory rate ${value} seems too high, dividing by 60 to get ${correctedValue} breaths/min`)
    }
    
    // Validate reasonable range (8-30 breaths/min)
    if (correctedValue >= 8 && correctedValue <= 30) {
      return correctedValue
    } else {
      console.warn(`[Report] Respiratory rate ${correctedValue} is implausible (expected 8-30 breaths/min), filtering out`)
      return null
    }
  }

  // Helper to get one value per day for a metric (average if multiple values per day)
  const getMetricValuesByDay = (data: DailyMetric[], metricKey: string): number[] => {
    // Group by day and get one value per day
    const byDay: { [day: string]: number[] } = {}
    data
      .filter((d) => d.metric_key === metricKey)
      .forEach((d) => {
        const value = parseValue(d.value)
        if (value !== null) {
          const dayStr = normalizeDate(d.day)
          if (!byDay[dayStr]) {
            byDay[dayStr] = []
          }
          // Clean respiratory rate values if this is a respiratory rate metric
          if (metricKey === 'sleep_respiratory_rate') {
            const cleanedValue = cleanRespiratoryRate(value)
            if (cleanedValue !== null) {
              byDay[dayStr].push(cleanedValue)
            }
          } else {
            byDay[dayStr].push(value)
          }
        }
      })
    
    // Average values per day (should be 1 per day, but handle duplicates)
    const values: number[] = []
    Object.keys(byDay).forEach(day => {
      const dayValues = byDay[day]
      const avg = dayValues.reduce((a, b) => a + b, 0) / dayValues.length
      values.push(avg)
    })
    
    return values
  }

  // Helper to get reference data for a specific metric (one value per day)
  const getReferenceData = (metricKey: string) => {
    return getMetricValuesByDay(finalReferenceData, metricKey)
  }

  // Get all unique metric keys from the data
  const allMetricKeys = [...new Set(dailyData.map(d => d.metric_key))].sort()
  console.log('[Report] Processing all metric keys:', allMetricKeys)

  // Define metric display configuration
  // Note: Data is normalized to standard units at storage time (seconds for durations, 0-100 for percentages)
  const metricConfig: {
    [key: string]: {
      name: string
      formatResult: (v: number) => string
      formatReference: (q25: number, q75: number) => string
      isCount?: boolean
    }
  } = {
    // Sleep metrics - NEW keys from /sleep endpoint (actual durations in seconds)
    'sleep_total_sleep_duration_seconds': { name: 'Sleep Duration', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'sleep_rem_sleep_duration_seconds': { name: 'REM Sleep Duration', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'sleep_deep_sleep_duration_seconds': { name: 'Deep Sleep Duration', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'sleep_light_sleep_duration_seconds': { name: 'Light Sleep Duration', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'sleep_latency_seconds': { name: 'Sleep Latency', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'sleep_time_in_bed_seconds': { name: 'Time in Bed', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'sleep_rem_pct': { name: 'REM Sleep %', formatResult: (v) => formatPercentage(v), formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)}%` },
    'sleep_deep_pct': { name: 'Deep Sleep %', formatResult: (v) => formatPercentage(v), formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)}%` },
    'sleep_light_pct': { name: 'Light Sleep %', formatResult: (v) => formatPercentage(v), formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)}%` },
    'sleep_efficiency_pct': { name: 'Sleep Efficiency', formatResult: (v) => formatPercentage(v), formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)}%` },
    
    // Sleep metrics - BACKWARD COMPATIBILITY aliases
    'sleep_duration': { name: 'Sleep Duration', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'sleep_latency': { name: 'Sleep Latency', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'rem_sleep_percentage': { name: 'REM Sleep %', formatResult: (v) => formatPercentage(v), formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)}%` },
    'deep_sleep_percentage': { name: 'Deep Sleep %', formatResult: (v) => formatPercentage(v), formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)}%` },
    'light_sleep_percentage': { name: 'Light Sleep %', formatResult: (v) => formatPercentage(v), formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)}%` },
    'sleep_efficiency': { name: 'Sleep Efficiency', formatResult: (v) => formatPercentage(v), formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)}%` },
    
    // Sleep metrics - Daily scores (0-100 component scores from daily_sleep.contributors)
    'daily_sleep_score': { name: 'Daily Sleep Score', formatResult: (v) => `${v.toFixed(0)} points`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} points` },
    'sleep_score': { name: 'Sleep Score', formatResult: (v) => `${v.toFixed(0)} points`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} points` },
    'sleep_total_sleep_contrib_score': { name: 'Sleep Total Sleep Score', formatResult: (v) => `${v.toFixed(1)} points`, formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)} points` },
    'sleep_rem_sleep_contrib_score': { name: 'Sleep REM Score', formatResult: (v) => `${v.toFixed(1)} points`, formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)} points` },
    'sleep_deep_sleep_contrib_score': { name: 'Sleep Deep Score', formatResult: (v) => `${v.toFixed(1)} points`, formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)} points` },
    'sleep_efficiency_contrib_score': { name: 'Sleep Efficiency Score', formatResult: (v) => `${v.toFixed(1)} points`, formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)} points` },
    'sleep_latency_contrib_score': { name: 'Sleep Latency Score', formatResult: (v) => `${v.toFixed(1)} points`, formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)} points` },
    'sleep_restfulness_contrib_score': { name: 'Sleep Restfulness Score', formatResult: (v) => `${v.toFixed(1)} points`, formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)} points` },
    'sleep_timing_contrib_score': { name: 'Sleep Timing Score', formatResult: (v) => `${v.toFixed(1)} points`, formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)} points` },
    
    // Readiness/Cardiovascular metrics
    'readiness_score': { name: 'Readiness Score', formatResult: (v) => `${v.toFixed(0)} points`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} points` },
    'resting_heart_rate': { name: 'Resting Heart Rate', formatResult: (v) => `${v.toFixed(0)} bpm`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} bpm` },
    'readiness_resting_heart_rate': { name: 'Resting HR (Readiness)', formatResult: (v) => `${v.toFixed(0)} bpm`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} bpm` },
    'sleep_lowest_heart_rate': { name: 'Lowest Night-time Heart Rate', formatResult: (v) => `${v.toFixed(0)} bpm`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} bpm` },
    'hrv_rmssd': { name: 'HRV (RMSSD)', formatResult: (v) => `${v.toFixed(0)} ms`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} ms` },
    'readiness_hrv_rmssd': { name: 'HRV RMSSD (Readiness)', formatResult: (v) => `${v.toFixed(0)} ms`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} ms` },
    'sleep_average_hrv': { name: 'Night-time HRV', formatResult: (v) => `${v.toFixed(0)} ms`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} ms` },
    'sleep_respiratory_rate': { name: 'Respiratory Rate', formatResult: (v) => `${v.toFixed(0)} breaths/min`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} breaths/min` },
    'temperature_deviation': { name: 'Temperature Deviation', formatResult: (v) => formatTemperatureDeviation(v), formatReference: (q25, q75) => formatTemperatureDeviationRange(q25, q75) },
    'readiness_temperature_deviation': { name: 'Temperature Deviation', formatResult: (v) => formatTemperatureDeviation(v), formatReference: (q25, q75) => formatTemperatureDeviationRange(q25, q75) },
    'readiness_temperature_trend_deviation': { name: 'Temperature Trend Deviation', formatResult: (v) => formatTemperatureDeviation(v), formatReference: (q25, q75) => formatTemperatureDeviationRange(q25, q75) },
    // SpO2 metrics
    'spo2_percentage_average': { name: 'Average Nightly SpO2', formatResult: (v) => `${v.toFixed(1)}%`, formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)}%` },
    'breathing_disturbance_index': { name: 'Breathing Disturbance Index', formatResult: (v) => `${v.toFixed(2)}`, formatReference: (q25, q75) => `${q25.toFixed(2)}–${q75.toFixed(2)}` },
    
    // Stress/Recovery metrics
    'recovery_high': { name: 'Recovery High', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'stress_stress_high': { name: 'Stress High', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    
    // Activity metrics
    'activity_score': { name: 'Activity Score', formatResult: (v) => `${v.toFixed(0)} points`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} points` },
    'steps': { name: 'Steps', formatResult: (v) => `${v.toFixed(0)} steps`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} steps` },
    'active_calories': { name: 'Active Calories', formatResult: (v) => `${v.toFixed(0)} kcal`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} kcal` },
    'total_calories': { name: 'Total Calories', formatResult: (v) => `${v.toFixed(0)} kcal`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} kcal` },
    // Activity time fields - NEW keys (in seconds)
    'high_activity_time_seconds': { name: 'High Activity Time', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'medium_activity_time_seconds': { name: 'Medium Activity Time', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'low_activity_time_seconds': { name: 'Low Activity Time', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'sedentary_time_seconds': { name: 'Sedentary Time', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'resting_time_seconds': { name: 'Resting Time', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'non_wear_time_seconds': { name: 'Non-Wear Time', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    
    // Activity time fields - BACKWARD COMPATIBILITY
    'sedentary_time': { name: 'Sedentary Time', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'high_activity_time': { name: 'High Activity Time', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'medium_activity_time': { name: 'Medium Activity Time', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'low_activity_time': { name: 'Low Activity Time', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'resting_time': { name: 'Resting Time', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'non_wear_time': { name: 'Non-Wear Time', formatResult: (v) => formatDuration(v), formatReference: (q25, q75) => formatReferenceDuration(q25, q75) },
    'meters_to_target': { name: 'Meters to Target', formatResult: (v) => `${v.toFixed(0)} m`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} m` },
    'equivalent_walking_distance': { name: 'Walking Distance', formatResult: (v) => `${v.toFixed(0)} m`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} m` },
    'target_calories': { name: 'Target Calories', formatResult: (v) => `${v.toFixed(0)} kcal`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} kcal` },
    'target_meters': { name: 'Target Meters', formatResult: (v) => `${v.toFixed(0)} m`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} m` },
    'average_met_minutes': { name: 'Avg MET Minutes', formatResult: (v) => `${v.toFixed(1)} min`, formatReference: (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)} min` },
    'inactivity_alerts': { name: 'Inactivity Alerts', formatResult: (v) => `${v.toFixed(0)} alerts`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} alerts` },
    'class_5_min_count': { name: 'Class 5 Min Count', formatResult: (v) => `${v.toFixed(0)} intervals`, formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} intervals` },
    
    // Stress metrics
    'high_stress': { name: 'High Stress Days', formatResult: (v) => formatCount(v, '7 days'), formatReference: (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} / week`, isCount: true },
  }

  // Process each metric key dynamically
  for (const metricKey of allMetricKeys) {
    const config = metricConfig[metricKey]
    
    // Generate display name from metric key if no config
    const displayName = config?.name || metricKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase())
      .replace(/Sleep /g, 'Sleep ')
      .replace(/Activity /g, 'Activity ')
      .replace(/Readiness /g, 'Readiness ')
      .replace(/Stress /g, 'Stress ')

    const metric7d = getMetricValuesByDay(last7Days, metricKey)
    const metricRef = getReferenceData(metricKey)

    // Special handling for count-based metrics (like high_stress)
    if (config?.isCount) {
      const count7dData = last7Days.filter((d) => d.metric_key === metricKey)
      const count7dValues = count7dData
        .map((d) => parseValue(d.value))
        .filter((v): v is number => v !== null && v > 0)
      
      const count7d = count7dValues.length
      
      // Calculate weekly counts for reference range
      const refData = finalReferenceData.filter((d) => d.metric_key === metricKey)
      const uniqueDays = Array.from(new Set(refData.map(d => d.day))).sort()
      const weeklyCounts: number[] = []
      for (let i = 0; i < uniqueDays.length; i += 7) {
        const weekDays = uniqueDays.slice(i, i + 7)
        let weekCount = 0
        weekDays.forEach(day => {
          const dayData = refData.find(d => d.day === day)
          if (dayData && parseValue(dayData.value) !== null && parseValue(dayData.value)! > 0) {
            weekCount++
          }
        })
        weeklyCounts.push(weekCount)
      }
      
      const clinicalRange = getClinicalRange(displayName, age, gender)
      const clinicalRangeDisplay = formatClinicalRange(clinicalRange)
      
      if (count7dData.length === 0) {
        metrics.push({
          metric: displayName,
          result_display: '—',
          flag: 'Normal',
          reference_display: weeklyCounts.length >= 3 
            ? `${calculateIQR(weeklyCounts).q25.toFixed(0)}–${calculateIQR(weeklyCounts).q75.toFixed(0)} / week`
            : weeklyCounts.length > 0
            ? `${Math.min(...weeklyCounts)}–${Math.max(...weeklyCounts)} / week`
            : '—',
          clinical_range: clinicalRangeDisplay,
        })
      } else if (weeklyCounts.length >= 3) {
        const iqr = calculateIQR(weeklyCounts)
        metrics.push({
          metric: displayName,
          result_display: formatCount(count7d, '7 days'),
          flag: getFlag(count7d, iqr.q25, iqr.q75),
          reference_display: `${iqr.q25.toFixed(0)}–${iqr.q75.toFixed(0)} / week`,
          clinical_range: clinicalRangeDisplay,
        })
      } else if (weeklyCounts.length > 0) {
        const min = Math.min(...weeklyCounts)
        const max = Math.max(...weeklyCounts)
        metrics.push({
          metric: displayName,
          result_display: formatCount(count7d, '7 days'),
          flag: 'Normal',
          reference_display: `${min}–${max} / week`,
          clinical_range: clinicalRangeDisplay,
        })
      } else {
        metrics.push({
          metric: displayName,
          result_display: formatCount(count7d, '7 days'),
          flag: 'Normal',
          reference_display: '—',
          clinical_range: clinicalRangeDisplay,
        })
      }
    } else if (config) {
      // Use configured formatting (data is already normalized at storage time)
      metrics.push(calculateMetric(
        metric7d,
        metricRef,
        displayName,
        config.formatResult,
        config.formatReference,
        age,
        gender
      ))
    } else {
      // Default formatting for unknown metrics
      // Data is already normalized at storage time, just format for display
      const metricLower = metricKey.toLowerCase()
      let formatResult: (v: number) => string
      let formatReference: (q25: number, q75: number) => string
      
      if (metricLower.includes('time') || metricLower.includes('duration') || metricLower.includes('latency')) {
        formatResult = (v) => formatDuration(v)
        formatReference = (q25, q75) => formatReferenceDuration(q25, q75)
      } else if (metricLower.includes('percentage') || metricLower.includes('percent') || metricLower.includes('efficiency')) {
        formatResult = (v) => formatPercentage(v)
        formatReference = (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)}%`
      } else if (metricLower.includes('calorie')) {
        formatResult = (v) => `${v.toFixed(0)} kcal`
        formatReference = (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} kcal`
      } else if (metricLower.includes('bpm') || metricLower.includes('heart')) {
        formatResult = (v) => `${v.toFixed(0)} bpm`
        formatReference = (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} bpm`
      } else if (metricLower.includes('ms') || metricLower.includes('hrv')) {
        formatResult = (v) => `${v.toFixed(0)} ms`
        formatReference = (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} ms`
      } else if (metricLower.includes('temperature') || metricLower.includes('deviation')) {
        // Temperature deviations: only multiply by 9/5, do NOT add 32
        formatResult = (v) => {
          const fahrenheit = v * 9/5
          return `${v.toFixed(2)}°C (${fahrenheit.toFixed(2)}°F)`
        }
        formatReference = (q25, q75) => {
          const q25F = q25 * 9/5
          const q75F = q75 * 9/5
          return `${q25.toFixed(2)}–${q75.toFixed(2)}°C (${q25F.toFixed(2)}–${q75F.toFixed(2)}°F)`
        }
      } else if (metricLower.includes('score') || metricLower.includes('restfulness') || metricLower.includes('timing')) {
        formatResult = (v) => `${v.toFixed(metricLower.includes('score') ? 0 : 1)} points`
        formatReference = (q25, q75) => `${q25.toFixed(metricLower.includes('score') ? 0 : 1)}–${q75.toFixed(metricLower.includes('score') ? 0 : 1)} points`
      } else if (metricLower.includes('step')) {
        formatResult = (v) => `${v.toFixed(0)} steps`
        formatReference = (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} steps`
      } else if (metricLower.includes('met') && metricLower.includes('minute')) {
        formatResult = (v) => `${v.toFixed(1)} min`
        formatReference = (q25, q75) => `${q25.toFixed(1)}–${q75.toFixed(1)} min`
      } else if (metricLower.includes('alert')) {
        formatResult = (v) => `${v.toFixed(0)} alerts`
        formatReference = (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} alerts`
      } else if (metricLower.includes('count') || metricLower.includes('interval')) {
        formatResult = (v) => `${v.toFixed(0)} intervals`
        formatReference = (q25, q75) => `${q25.toFixed(0)}–${q75.toFixed(0)} intervals`
      } else {
        // Default: 2 decimal places (no unit for unknown metrics)
        formatResult = (v) => `${v.toFixed(2)}`
        formatReference = (q25, q75) => `${q25.toFixed(2)}–${q75.toFixed(2)}`
      }
      
      metrics.push(calculateMetric(
        metric7d,
        metricRef,
        displayName,
        formatResult,
        formatReference,
        age,
        gender
      ))
    }
  }

  // Clean and deduplicate metrics before returning
  return cleanReportMetrics(metrics)
}

/**
 * Clean report metrics: remove proprietary scores, deduplicate, keep only clinically interpretable metrics
 */
function cleanReportMetrics(metrics: ReportMetric[]): ReportMetric[] {
  // Metrics to remove (proprietary scores, targets, indices)
  // Use case-insensitive matching
  const metricsToRemoveLower = new Set([
    // Sleep / Readiness scores
    'Daily Sleep Score',
    'Daily Sleep Timestamp',
    'Readiness Sleep Balance',
    'Readiness Sleep Balance Contrib Score',
    'Readiness Sleep Regularity',
    'Readiness Sleep Regularity Contrib Score',
    'Sleep Deep Sleep',
    'Sleep Deep Score',
    'Sleep Efficiency Score',
    'Sleep Efficiency From Record',
    'Sleep Latency Score',
    'Sleep Rem Sleep',
    'Sleep REM Score',
    'Sleep Restfulness',
    'Sleep Restfulness Score',
    'Sleep Score',
    'Sleep Timing',
    'Sleep Timing Score',
    'Sleep Total Sleep',
    'Sleep Total Sleep Score',
    'Daily Sleep Timestamp',
    
    // Cardiovascular & Recovery scores
    'Readiness Activity Balance',
    'Readiness Activity Balance Contrib Score',
    'Readiness Body Temperature',
    'Readiness Body Temperature Contrib Score',
    'Readiness Hrv Balance Contrib Score',
    'Readiness Previous Day Activity',
    'Readiness Previous Day Activity Contrib Score',
    'Readiness Previous Night',
    'Readiness Previous Night Contrib Score',
    'Readiness Recovery Index',
    'Readiness Recovery Index Contrib Score',
    'Resting HR (Readiness)',
    'Readiness Resting Heart Rate Contrib Score',
    'Readiness Score',
    'Readiness Temperature Deviation',
    'Readiness Temperature Trend Deviation',
    
    // Activity / gamified metrics
    'Activity Meet Daily Targets',
    'Activity Meet Daily Targets Contrib Score',
    'Activity Move Every Hour',
    'Activity Move Every Hour Contrib Score',
    'Activity Recovery Time',
    'Activity Recovery Time Contrib Score',
    'Activity Score',
    'Activity Stay Active',
    'Activity Stay Active Contrib Score',
    'Activity Training Frequency',
    'Activity Training Frequency Contrib Score',
    'Activity Training Volume',
    'Activity Training Volume Contrib Score',
    'Meters to Target',
    'Target Calories',
    'Target Meters',
    'Inactivity Alerts',
    
    // Activity / detailed MET metrics
    'Avg MET Minutes',
    'High Activity Met Minutes',
    'Low Activity Met Minutes',
    'Medium Activity Met Minutes',
    'Sedentary Met Minutes',
    
    // Stress & Other
    'Stress Day Summary',
    'Stress High',
    'Day Summary',
    'Recovery High',
    'Score', // Generic "Score" row
  ].map(s => s.toLowerCase()))

  // Filter out unwanted metrics (case-insensitive)
  let cleaned = metrics.filter(m => {
    const metricLower = m.metric.toLowerCase().trim()
    
    // Check exact match first
    if (metricsToRemoveLower.has(metricLower)) {
      return false
    }
    
    // Pattern-based removal (but with exceptions for clinically useful metrics)
    // Remove anything with "Contrib Score" (these are component scores, not real values)
    if (metricLower.includes('contrib score')) {
      return false
    }
    
    // Remove generic "Score" metrics (but keep specific ones like "Sleep Efficiency" which is a percentage)
    if (metricLower === 'score' || 
        (metricLower.endsWith(' score') && !metricLower.includes('efficiency') && !metricLower.includes('latency'))) {
      return false
    }
    
    // Remove MET minutes (too granular)
    if (metricLower.includes('met minutes') || metricLower.includes('met minute')) {
      return false
    }
    
    // Remove target-related metrics
    if (metricLower.includes('target') && (metricLower.includes('calories') || metricLower.includes('meters'))) {
      return false
    }
    
    // Remove "Meters to Target"
    if (metricLower.includes('meters to target')) {
      return false
    }
    
    // Remove inactivity alerts (not clinically useful)
    if (metricLower.includes('inactivity alert')) {
      return false
    }
    
    // Remove day summary text fields
    if (metricLower.includes('day summary') || metricLower.includes('stress day summary')) {
      return false
    }
    
    // Keep everything else (clinically interpretable metrics)
    return true
  })

  // Deduplicate: if same metric appears multiple times, keep the best one
  // Group by normalized metric name (handle variations like "Sleep Duration" vs "Sleep Duration (Raw)")
  const metricMap = new Map<string, ReportMetric>()
  
  // Normalize metric name for deduplication (remove common suffixes)
  const normalizeMetricName = (name: string): string => {
    return name
      .replace(/\s*\(Raw\)\s*/gi, '')
      .replace(/\s*Contrib Score\s*/gi, '')
      .replace(/\s*Score\s*$/gi, '')
      .trim()
  }
  
  // Map of normalized name -> list of metrics with that name
  const metricsByNormalizedName = new Map<string, ReportMetric[]>()
  
  for (const metric of cleaned) {
    const normalized = normalizeMetricName(metric.metric)
    if (!metricsByNormalizedName.has(normalized)) {
      metricsByNormalizedName.set(normalized, [])
    }
    metricsByNormalizedName.get(normalized)!.push(metric)
  }
  
  // For each normalized name, pick the best metric
  for (const [normalizedName, metrics] of metricsByNormalizedName.entries()) {
    if (metrics.length === 1) {
      metricMap.set(metrics[0].metric, metrics[0])
      continue
    }
    
    // Multiple metrics with same normalized name - pick the best one
    let best = metrics[0]
    
    for (const metric of metrics.slice(1)) {
      // Prefer metric with data over "—"
      if (best.result_display === '—' && metric.result_display !== '—') {
        best = metric
        continue
      }
      if (best.result_display !== '—' && metric.result_display === '—') {
        continue // Keep best
      }
      
      // Both have data or both are "—", prefer human-readable format
      const bestIsHumanReadable = best.result_display.includes('h ') || 
                                  best.result_display.includes('min') ||
                                  best.result_display.includes('%') ||
                                  best.result_display.includes('bpm') ||
                                  best.result_display.includes('ms') ||
                                  best.result_display.includes('kcal') ||
                                  best.result_display.includes('steps')
      
      const currentIsHumanReadable = metric.result_display.includes('h ') || 
                                    metric.result_display.includes('min') ||
                                    metric.result_display.includes('%') ||
                                    metric.result_display.includes('bpm') ||
                                    metric.result_display.includes('ms') ||
                                    metric.result_display.includes('kcal') ||
                                    metric.result_display.includes('steps')
      
      if (!bestIsHumanReadable && currentIsHumanReadable) {
        best = metric
        continue
      }
      if (bestIsHumanReadable && !currentIsHumanReadable) {
        continue // Keep best
      }
      
      // Both same format, prefer shorter metric name (less verbose)
      if (metric.metric.length < best.metric.length) {
        best = metric
      }
    }
    
    metricMap.set(best.metric, best)
  }

  return Array.from(metricMap.values())
}
