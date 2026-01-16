/**
 * Clinical Reference Ranges
 * Population-based reference ranges for health metrics
 * These are static ranges based on general population data
 */

export interface ClinicalRange {
  min: number
  max: number
  unit?: string
}

export interface ClinicalRanges {
  [metric: string]: ClinicalRange | ((age?: number, gender?: string) => ClinicalRange)
}

// Base clinical reference ranges
const BASE_RANGES: ClinicalRanges = {
  // Sleep metrics
  'Sleep Duration': { min: 7 * 60, max: 9 * 60, unit: 'minutes' }, // 7-9 hours
  'Time in Bed': { min: 7.5 * 60, max: 9.5 * 60, unit: 'minutes' }, // 7.5-9.5 hours
  'Deep Sleep': { min: 12, max: 18, unit: '%' },
  'Light Sleep': { min: 55, max: 70, unit: '%' },
  'REM Sleep': { min: 18, max: 25, unit: '%' },
  
  // Cardiovascular
  'Resting Heart Rate': (age?: number, gender?: string) => {
    // Age-adjusted ranges
    if (age) {
      if (age < 30) return { min: 55, max: 70, unit: 'bpm' }
      if (age < 40) return { min: 60, max: 75, unit: 'bpm' }
      if (age < 50) return { min: 60, max: 80, unit: 'bpm' }
      if (age < 60) return { min: 65, max: 85, unit: 'bpm' }
      return { min: 70, max: 90, unit: 'bpm' }
    }
    // Default range
    return { min: 60, max: 80, unit: 'bpm' }
  },
  'Lowest Night-time Heart Rate': { min: 40, max: 55, unit: 'bpm' },
  'Night-time HRV': (age?: number) => {
    // HRV decreases with age
    if (age) {
      if (age < 30) return { min: 40, max: 60, unit: 'ms' }
      if (age < 40) return { min: 35, max: 55, unit: 'ms' }
      if (age < 50) return { min: 30, max: 50, unit: 'ms' }
      if (age < 60) return { min: 25, max: 45, unit: 'ms' }
      return { min: 20, max: 40, unit: 'ms' }
    }
    return { min: 30, max: 50, unit: 'ms' }
  },
  
  // Oxygenation
  'Oxygen Saturation (SpO2)': { min: 95, max: 100, unit: '%' },
  'Breathing Disturbance Index': { min: 0, max: 5, unit: '' },
  
  // Temperature
  'Temperature Deviation': { min: -0.3, max: 0.3, unit: '°C' },
  
  // Activity
  'Steps': { min: 7000, max: 10000, unit: 'steps' },
  'Sedentary Time': { min: 6 * 60, max: 9 * 60, unit: 'minutes' }, // 6-9 hours
}

/**
 * Get clinical reference range for a metric
 */
export function getClinicalRange(
  metric: string,
  age?: number | null,
  gender?: string | null
): ClinicalRange | null {
  const rangeDef = BASE_RANGES[metric]
  
  if (!rangeDef) {
    return null
  }
  
  if (typeof rangeDef === 'function') {
    return rangeDef(age || undefined, gender || undefined)
  }
  
  return rangeDef
}

/**
 * Format clinical range for display
 */
export function formatClinicalRange(range: ClinicalRange | null): string {
  if (!range) {
    return 'N/A'
  }
  
  const { min, max, unit = '' } = range
  
  // Handle time-based ranges (minutes)
  if (unit === 'minutes' && min > 60) {
    const minHours = Math.floor(min / 60)
    const minMins = min % 60
    const maxHours = Math.floor(max / 60)
    const maxMins = max % 60
    
    const minStr = minMins > 0 ? `${minHours}h ${minMins}m` : `${minHours}h`
    const maxStr = maxMins > 0 ? `${maxHours}h ${maxMins}m` : `${maxHours}h`
    
    return `${minStr} – ${maxStr}`
  }
  
  // Handle percentage ranges
  if (unit === '%') {
    return `${min}–${max}%`
  }
  
  // Handle steps
  if (unit === 'steps') {
    return `${min.toLocaleString()}–${max.toLocaleString()} steps`
  }
  
  // Default format
  return `${min}–${max}${unit ? ` ${unit}` : ''}`
}
