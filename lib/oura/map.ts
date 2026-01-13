/**
 * Oura API v2 Response Mapping
 * 
 * CRITICAL: Contributors in daily_* endpoints are 0-100 component SCORES, NOT real-world durations/values.
 * Real durations come from /v2/usercollection/sleep endpoint.
 */

interface MetricMapping {
  metric_key: string
  value: string
}

interface MappedData {
  day: string
  metrics: MetricMapping[]
}

const DEBUG = process.env.OURA_DEBUG === '1'

function normalizeDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null
  return dateStr.split('T')[0]
}

/**
 * Validate and clamp a score to 0-100 range
 */
function validateScore(value: number | null | undefined, metricName: string): number | null {
  if (value == null) return null
  if (value < 0 || value > 100) {
    console.warn(`[OuraMap] Invalid score ${value} for ${metricName}, clamping to [0, 100]`)
    return Math.max(0, Math.min(100, value))
  }
  return value
}

/**
 * Validate sleep duration is plausible (0-16 hours in seconds)
 */
function validateSleepDuration(seconds: number | null | undefined, metricName: string): number | null {
  if (seconds == null || seconds < 0) return null
  const maxSeconds = 16 * 3600 // 16 hours
  if (seconds > maxSeconds) {
    console.warn(`[OuraMap] Implausible sleep duration ${seconds}s (${seconds/3600}h) for ${metricName}, skipping`)
    return null
  }
  return seconds
}

/**
 * Map daily_sleep endpoint response
 * 
 * IMPORTANT: item.contributors.* are 0-100 component scores, NOT durations.
 * Do NOT convert them to seconds/minutes/hours.
 */
export function mapDailySleep(record: any): MappedData | null {
  const day = normalizeDate(record.day || record.date || record.timestamp)
  if (!day) {
    return null
  }

  const metrics: MetricMapping[] = []
  const contributors = record.contributors || {}

  if (DEBUG) {
    console.log(`[OuraMap] [DEBUG] daily_sleep for ${day}:`, {
      score: record.score,
      contributors: Object.keys(contributors),
      contributor_values: contributors,
    })
  }

  // Store daily sleep score (0-100)
  if (record.score != null) {
    const score = validateScore(record.score, 'sleep_score')
    if (score != null) {
      metrics.push({ metric_key: 'daily_sleep_score', value: String(Math.round(score)) })
      // Backward compatibility alias
      metrics.push({ metric_key: 'sleep_score', value: String(Math.round(score)) })
    }
  }

  // Store ALL contributors as component scores (0-100)
  // These are NOT durations - they are sub-scores that contribute to the main score
  const contributorFields = [
    'deep_sleep',
    'rem_sleep',
    'efficiency',
    'latency',
    'restfulness',
    'timing',
    'total_sleep',
  ]

  for (const field of contributorFields) {
    if (contributors[field] != null) {
      const score = validateScore(contributors[field], `sleep_${field}_contrib_score`)
      if (score != null) {
        metrics.push({
          metric_key: `sleep_${field}_contrib_score`,
          value: String(score.toFixed(1)),
        })
      }
    }
  }

  // Store any other top-level fields (except metadata)
  if (record.timestamp != null) {
    metrics.push({ metric_key: 'daily_sleep_timestamp', value: String(record.timestamp) })
  }

  if (DEBUG) {
    console.log(`[OuraMap] [DEBUG] Mapped daily_sleep metrics for ${day}:`, metrics.map(m => `${m.metric_key}=${m.value}`))
  }

  return { day, metrics }
}

/**
 * Map sleep (non-daily) endpoint response
 * 
 * This endpoint provides ACTUAL durations in seconds.
 * Use this for real sleep stage durations and percentages.
 */
export function mapSleepRecord(record: any): MappedData | null {
  const day = normalizeDate(record.day || record.date || record.timestamp)
  if (!day) {
    return null
  }

  const metrics: MetricMapping[] = []

  if (DEBUG) {
    console.log(`[OuraMap] [DEBUG] sleep record for ${day}:`, {
      total_sleep_duration: record.total_sleep_duration,
      rem_sleep_duration: record.rem_sleep_duration,
      deep_sleep_duration: record.deep_sleep_duration,
      light_sleep_duration: record.light_sleep_duration,
      latency: record.latency,
      time_in_bed: record.time_in_bed,
    })
  }

  // All duration fields from /sleep endpoint are in SECONDS (per Oura API v2 docs)
  const totalSleepSeconds = validateSleepDuration(record.total_sleep_duration, 'sleep_total_sleep_duration_seconds')
  const remSleepSeconds = validateSleepDuration(record.rem_sleep_duration, 'sleep_rem_sleep_duration_seconds')
  const deepSleepSeconds = validateSleepDuration(record.deep_sleep_duration, 'sleep_deep_sleep_duration_seconds')
  const lightSleepSeconds = validateSleepDuration(record.light_sleep_duration, 'sleep_light_sleep_duration_seconds')
  const latencySeconds = validateSleepDuration(record.latency, 'sleep_latency_seconds')
  const timeInBedSeconds = validateSleepDuration(record.time_in_bed, 'sleep_time_in_bed_seconds')

  // Store durations (in seconds)
  if (totalSleepSeconds != null) {
    metrics.push({ metric_key: 'sleep_total_sleep_duration_seconds', value: String(Math.round(totalSleepSeconds)) })
    // Backward compatibility alias
    metrics.push({ metric_key: 'sleep_duration', value: String(Math.round(totalSleepSeconds)) })
  }

  if (remSleepSeconds != null) {
    metrics.push({ metric_key: 'sleep_rem_sleep_duration_seconds', value: String(Math.round(remSleepSeconds)) })
  }

  if (deepSleepSeconds != null) {
    metrics.push({ metric_key: 'sleep_deep_sleep_duration_seconds', value: String(Math.round(deepSleepSeconds)) })
  }

  if (lightSleepSeconds != null) {
    metrics.push({ metric_key: 'sleep_light_sleep_duration_seconds', value: String(Math.round(lightSleepSeconds)) })
  }

  if (latencySeconds != null) {
    metrics.push({ metric_key: 'sleep_latency_seconds', value: String(Math.round(latencySeconds)) })
    // Backward compatibility alias
    metrics.push({ metric_key: 'sleep_latency', value: String(Math.round(latencySeconds)) })
  }

  if (timeInBedSeconds != null) {
    metrics.push({ metric_key: 'sleep_time_in_bed_seconds', value: String(Math.round(timeInBedSeconds)) })
  }

  // Calculate percentages ONLY if we have valid total sleep duration
  if (totalSleepSeconds != null && totalSleepSeconds > 0) {
    // REM sleep percentage
    if (remSleepSeconds != null && remSleepSeconds >= 0) {
      const remPct = (remSleepSeconds / totalSleepSeconds) * 100
      if (remPct >= 0 && remPct <= 100) {
        metrics.push({ metric_key: 'sleep_rem_pct', value: String(remPct.toFixed(1)) })
        // Backward compatibility alias
        metrics.push({ metric_key: 'rem_sleep_percentage', value: String(remPct.toFixed(1)) })
      } else {
        console.warn(`[OuraMap] Invalid REM percentage ${remPct}% for ${day}`)
      }
    }

    // Deep sleep percentage
    if (deepSleepSeconds != null && deepSleepSeconds >= 0) {
      const deepPct = (deepSleepSeconds / totalSleepSeconds) * 100
      if (deepPct >= 0 && deepPct <= 100) {
        metrics.push({ metric_key: 'sleep_deep_pct', value: String(deepPct.toFixed(1)) })
        // Backward compatibility alias
        metrics.push({ metric_key: 'deep_sleep_percentage', value: String(deepPct.toFixed(1)) })
      } else {
        console.warn(`[OuraMap] Invalid Deep percentage ${deepPct}% for ${day}`)
      }
    }

    // Light sleep percentage
    if (lightSleepSeconds != null && lightSleepSeconds >= 0) {
      const lightPct = (lightSleepSeconds / totalSleepSeconds) * 100
      if (lightPct >= 0 && lightPct <= 100) {
        metrics.push({ metric_key: 'sleep_light_pct', value: String(lightPct.toFixed(1)) })
        // Backward compatibility alias
        metrics.push({ metric_key: 'light_sleep_percentage', value: String(lightPct.toFixed(1)) })
      }
    } else if (remSleepSeconds != null && deepSleepSeconds != null) {
      // Calculate light sleep as remainder if not provided
      const lightSleep = totalSleepSeconds - remSleepSeconds - deepSleepSeconds
      if (lightSleep > 0) {
        const lightPct = (lightSleep / totalSleepSeconds) * 100
        if (lightPct >= 0 && lightPct <= 100) {
          metrics.push({ metric_key: 'sleep_light_pct', value: String(lightPct.toFixed(1)) })
          metrics.push({ metric_key: 'light_sleep_percentage', value: String(lightPct.toFixed(1)) })
        }
      }
    }

    // Sleep efficiency (if time_in_bed is available)
    if (timeInBedSeconds != null && timeInBedSeconds > 0) {
      const efficiency = (totalSleepSeconds / timeInBedSeconds) * 100
      if (efficiency >= 0 && efficiency <= 100) {
        metrics.push({ metric_key: 'sleep_efficiency_pct', value: String(efficiency.toFixed(1)) })
        // Backward compatibility alias
        metrics.push({ metric_key: 'sleep_efficiency', value: String(efficiency.toFixed(1)) })
      }
    }
  } else {
    if (DEBUG) {
      console.warn(`[OuraMap] [DEBUG] Skipping percentage calculations for ${day} - invalid total_sleep_duration`)
    }
  }

  // Store other fields if available
  if (record.efficiency != null) {
    const efficiency = validateScore(record.efficiency, 'sleep_efficiency_from_record')
    if (efficiency != null) {
      metrics.push({ metric_key: 'sleep_efficiency_from_record', value: String(efficiency.toFixed(1)) })
    }
  }

  // Store heart rate and HRV metrics from sleep endpoint
  // These are ACTUAL values (BPM and ms), not scores
  if (record.average_heart_rate != null) {
    metrics.push({ metric_key: 'sleep_average_heart_rate', value: String(Math.round(record.average_heart_rate)) })
  }

  if (record.lowest_heart_rate != null) {
    const lowestHR = Math.round(record.lowest_heart_rate)
    metrics.push({ metric_key: 'sleep_lowest_heart_rate', value: String(lowestHR) })
    // Also store as resting_heart_rate - lowest night-time HR is the best proxy for true resting HR
    metrics.push({ metric_key: 'resting_heart_rate', value: String(lowestHR) })
  }

  if (record.average_hrv != null) {
    const avgHRV = Math.round(record.average_hrv)
    metrics.push({ metric_key: 'sleep_average_hrv', value: String(avgHRV) })
    // Also store as hrv_rmssd for backward compatibility - this is actual ms value
    metrics.push({ metric_key: 'hrv_rmssd', value: String(avgHRV) })
  }

  if (DEBUG) {
    console.log(`[OuraMap] [DEBUG] Mapped sleep record metrics for ${day}:`, metrics.map(m => `${m.metric_key}=${m.value}`))
  }

  return { day, metrics }
}

/**
 * Map daily_readiness endpoint response
 * 
 * IMPORTANT: item.contributors.* are 0-100 component scores, NOT real-world values.
 */
export function mapDailyReadiness(record: any): MappedData | null {
  const day = normalizeDate(record.day || record.date || record.timestamp)
  if (!day) {
    return null
  }

  const metrics: MetricMapping[] = []
  const contributors = record.contributors || {}

  if (DEBUG) {
    console.log(`[OuraMap] [DEBUG] daily_readiness for ${day}:`, {
      score: record.score,
      contributors: Object.keys(contributors),
    })
  }

  // Store daily readiness score (0-100)
  if (record.score != null) {
    const score = validateScore(record.score, 'readiness_score')
    if (score != null) {
      metrics.push({ metric_key: 'readiness_score', value: String(Math.round(score)) })
    }
  }

  // Store temperature fields (these are actual values, not scores)
  if (record.temperature_deviation != null) {
    metrics.push({ metric_key: 'readiness_temperature_deviation', value: String(record.temperature_deviation) })
    // Backward compatibility alias
    metrics.push({ metric_key: 'temperature_deviation', value: String(record.temperature_deviation) })
  }

  if (record.temperature_trend_deviation != null) {
    metrics.push({ metric_key: 'readiness_temperature_trend_deviation', value: String(record.temperature_trend_deviation) })
  }

  // Store ALL contributors as component scores (0-100)
  const contributorFields = [
    'activity_balance',
    'body_temperature',
    'hrv_balance',
    'previous_day_activity',
    'previous_night',
    'recovery_index',
    'resting_heart_rate',
    'sleep_balance',
    'sleep_regularity',
  ]

  for (const field of contributorFields) {
    if (contributors[field] != null) {
      const score = validateScore(contributors[field], `readiness_${field}_contrib_score`)
      if (score != null) {
        metrics.push({
          metric_key: `readiness_${field}_contrib_score`,
          value: String(score.toFixed(1)),
        })
      }
    }
  }

  // NOTE: resting_heart_rate and hrv_rmssd from contributors are SCORES (0-100), NOT actual values
  // DO NOT store these as resting_heart_rate or hrv_rmssd - they will be confused with actual BPM/ms values
  // Real HR and HRV values come from /sleep endpoint (lowest_heart_rate, average_hrv) and /heartrate endpoint
  // Only store them as clearly labeled contributor scores
  const restingHRScore = contributors.resting_heart_rate
  if (restingHRScore != null) {
    const score = validateScore(restingHRScore, 'readiness_resting_heart_rate_contrib_score')
    if (score != null) {
      // Only store as contributor score - NOT as resting_heart_rate (which should be actual BPM)
      metrics.push({ metric_key: 'readiness_resting_heart_rate_contrib_score', value: String(score.toFixed(1)) })
    }
  }

  const hrvScore = contributors.hrv_balance
  if (hrvScore != null) {
    const score = validateScore(hrvScore, 'readiness_hrv_balance_contrib_score')
    if (score != null) {
      // Only store as contributor score - NOT as hrv_rmssd (which should be actual ms)
      metrics.push({ metric_key: 'readiness_hrv_balance_contrib_score', value: String(score.toFixed(1)) })
    }
  }

  if (DEBUG) {
    console.log(`[OuraMap] [DEBUG] Mapped daily_readiness metrics for ${day}:`, metrics.map(m => `${m.metric_key}=${m.value}`))
  }

  return { day, metrics }
}

/**
 * Map daily_activity endpoint response
 * 
 * Time fields need unit detection (seconds vs minutes).
 * Contributors are 0-100 component scores.
 */
export function mapDailyActivity(record: any): MappedData | null {
  const day = normalizeDate(record.day || record.date || record.timestamp)
  if (!day) {
    return null
  }

  const metrics: MetricMapping[] = []
  const contributors = record.contributors || {}

  if (DEBUG) {
    console.log(`[OuraMap] [DEBUG] daily_activity for ${day}:`, {
      score: record.score,
      steps: record.steps,
      time_fields: {
        high_activity_time: record.high_activity_time,
        medium_activity_time: record.medium_activity_time,
        low_activity_time: record.low_activity_time,
        sedentary_time: record.sedentary_time,
        resting_time: record.resting_time,
        non_wear_time: record.non_wear_time,
      },
    })
  }

  // Store daily activity score (0-100)
  if (record.score != null) {
    const score = validateScore(record.score, 'activity_score')
    if (score != null) {
      metrics.push({ metric_key: 'activity_score', value: String(Math.round(score)) })
    }
  }

  // Store steps (integer)
  if (record.steps != null && typeof record.steps === 'number') {
    metrics.push({ metric_key: 'steps', value: String(Math.round(record.steps)) })
  }

  // Store calories (kcal)
  if (record.active_calories != null && typeof record.active_calories === 'number') {
    metrics.push({ metric_key: 'active_calories', value: String(Math.round(record.active_calories)) })
  }

  if (record.total_calories != null && typeof record.total_calories === 'number') {
    metrics.push({ metric_key: 'total_calories', value: String(Math.round(record.total_calories)) })
  }

  // Time fields: Oura API v2 returns these in SECONDS
  // Convert to seconds and store consistently
  const timeFields = [
    'high_activity_time',
    'medium_activity_time',
    'low_activity_time',
    'sedentary_time',
    'resting_time',
    'non_wear_time',
  ]

  for (const field of timeFields) {
    if (record[field] != null && typeof record[field] === 'number') {
      // Oura API v2: time fields are in seconds
      // Store as seconds (no conversion needed)
      const seconds = Math.round(record[field])
      metrics.push({
        metric_key: `${field}_seconds`,
        value: String(seconds),
      })
      
      // Backward compatibility for sedentary_time
      if (field === 'sedentary_time') {
        metrics.push({ metric_key: 'sedentary_time', value: String(seconds) })
      }
    }
  }

  // Store class_5_min array length if it exists
  if (Array.isArray(record.class_5_min)) {
    metrics.push({ metric_key: 'class_5_min_count', value: String(record.class_5_min.length) })
  }

  // Store other numeric fields
  if (record.meters_to_target != null) {
    metrics.push({ metric_key: 'meters_to_target', value: String(Math.round(record.meters_to_target)) })
  }

  if (record.equivalent_walking_distance != null) {
    metrics.push({ metric_key: 'equivalent_walking_distance', value: String(Math.round(record.equivalent_walking_distance)) })
  }

  if (record.target_calories != null) {
    metrics.push({ metric_key: 'target_calories', value: String(Math.round(record.target_calories)) })
  }

  if (record.target_meters != null) {
    metrics.push({ metric_key: 'target_meters', value: String(Math.round(record.target_meters)) })
  }

  if (record.average_met_minutes != null) {
    metrics.push({ metric_key: 'average_met_minutes', value: String(record.average_met_minutes.toFixed(1)) })
  }

  if (record.inactivity_alerts != null) {
    metrics.push({ metric_key: 'inactivity_alerts', value: String(Math.round(record.inactivity_alerts)) })
  }

  // Store ALL contributors as component scores (0-100)
  const contributorFields = [
    'meet_daily_targets',
    'move_every_hour',
    'recovery_time',
    'stay_active',
    'training_frequency',
    'training_volume',
  ]

  for (const field of contributorFields) {
    if (contributors[field] != null) {
      const score = validateScore(contributors[field], `activity_${field}_contrib_score`)
      if (score != null) {
        metrics.push({
          metric_key: `activity_${field}_contrib_score`,
          value: String(score.toFixed(1)),
        })
      }
    }
  }

  if (DEBUG) {
    console.log(`[OuraMap] [DEBUG] Mapped daily_activity metrics for ${day}:`, metrics.map(m => `${m.metric_key}=${m.value}`))
  }

  return { day, metrics }
}

/**
 * Map daily_stress endpoint response
 * 
 * No unit guessing - store values as provided.
 */
export function mapDailyStress(record: any): MappedData | null {
  const day = normalizeDate(record.day || record.date || record.timestamp)
  if (!day) {
    return null
  }

  const metrics: MetricMapping[] = []

  if (DEBUG) {
    console.log(`[OuraMap] [DEBUG] daily_stress for ${day}:`, {
      stress_high: record.stress_high,
      recovery_high: record.recovery_high,
      day_summary: record.day_summary,
    })
  }

  // Store stress_high and recovery_high as provided (no unit conversion)
  // These are likely durations in seconds, but we don't assume
  if (record.stress_high != null) {
    if (typeof record.stress_high === 'number') {
      metrics.push({ metric_key: 'stress_high', value: String(record.stress_high) })
    } else if (typeof record.stress_high === 'boolean') {
      metrics.push({ metric_key: 'stress_high', value: record.stress_high ? '1' : '0' })
    }
  }

  if (record.recovery_high != null) {
    if (typeof record.recovery_high === 'number') {
      metrics.push({ metric_key: 'recovery_high', value: String(record.recovery_high) })
    } else if (typeof record.recovery_high === 'boolean') {
      metrics.push({ metric_key: 'recovery_high', value: record.recovery_high ? '1' : '0' })
    }
  }

  // Store day_summary if it's a string
  if (record.day_summary && typeof record.day_summary === 'string') {
    metrics.push({ metric_key: 'stress_day_summary', value: record.day_summary })
  }

  // Handle day_summary object if it exists
  if (record.day_summary && typeof record.day_summary === 'object') {
    for (const [key, value] of Object.entries(record.day_summary)) {
      if (value != null) {
        if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
          metrics.push({ metric_key: `stress_${key}`, value: String(value) })
        }
      }
    }
  }

  // High stress indicator (boolean or count)
  const highStressValue = record.stress_high || (record.day_summary && record.day_summary.stress_high)
  if (highStressValue != null) {
    const hasHighStress = (typeof highStressValue === 'number' && highStressValue > 0) ||
                         (typeof highStressValue === 'boolean' && highStressValue) ||
                         (highStressValue === 'true' || highStressValue === 1 || highStressValue === '1')
      ? '1'
      : '0'
    metrics.push({ metric_key: 'high_stress', value: hasHighStress })
  }

  if (DEBUG) {
    console.log(`[OuraMap] [DEBUG] Mapped daily_stress metrics for ${day}:`, metrics.map(m => `${m.metric_key}=${m.value}`))
  }

  return { day, metrics }
}

/**
 * Map daily_spo2 endpoint response
 * 
 * This endpoint provides SpO2 (blood oxygen saturation) data.
 */
export function mapDailySpo2(record: any): MappedData | null {
  const day = normalizeDate(record.day || record.date || record.timestamp)
  if (!day) {
    return null
  }

  const metrics: MetricMapping[] = []

  if (DEBUG) {
    console.log(`[OuraMap] [DEBUG] daily_spo2 for ${day}:`, {
      spo2_percentage: record.spo2_percentage,
      breathing_disturbance_index: record.breathing_disturbance_index,
    })
  }

  // SpO2 percentage average
  if (record.spo2_percentage?.average != null) {
    const avg = parseFloat(String(record.spo2_percentage.average))
    if (!isNaN(avg) && avg >= 0 && avg <= 100) {
      metrics.push({ metric_key: 'spo2_percentage_average', value: String(avg.toFixed(1)) })
    }
  }

  // Breathing disturbance index
  if (record.breathing_disturbance_index != null) {
    const bdi = parseFloat(String(record.breathing_disturbance_index))
    if (!isNaN(bdi) && bdi >= 0) {
      metrics.push({ metric_key: 'breathing_disturbance_index', value: String(bdi.toFixed(2)) })
    }
  }

  if (DEBUG) {
    console.log(`[OuraMap] [DEBUG] Mapped daily_spo2 for ${day}:`, metrics.map(m => `${m.metric_key}=${m.value}`))
  }

  return { day, metrics }
}
