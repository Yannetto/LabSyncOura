import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { calculateReportMetrics } from '@/lib/report/calculations'
import { formatDoctorSummary } from '@/lib/report/doctor-summary'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceSupabase = createServiceClient()
    
    // Calculate date range - fetch last 90 days to ensure we have enough data
    // (7 days for report + 30 days for reference, plus buffer for gaps)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const ninetyDaysAgo = new Date(now)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const startDateStr = ninetyDaysAgo.toISOString().split('T')[0]
    
    // Fetch all data for the last 90 days (no limit to get all available data)
    const { data: dailyData, error: fetchError } = await serviceSupabase
      .from('oura_daily')
      .select('day, metric_key, value')
      .eq('user_id', user.id)
      .gte('day', startDateStr)
      .order('day', { ascending: false })

    if (fetchError) {
      console.error('[DoctorSummary] Database fetch error:', fetchError)
      throw fetchError
    }

    // Debug: Log comprehensive data summary
    console.log(`[DoctorSummary] Fetched ${dailyData?.length || 0} total records from database`)
    console.log(`[DoctorSummary] Date range: ${startDateStr} to ${now.toISOString().split('T')[0]}`)
    
    if (dailyData && dailyData.length > 0) {
      const uniqueDays = [...new Set(dailyData.map(d => d.day))].sort()
      const uniqueMetrics = [...new Set(dailyData.map(d => d.metric_key))].sort()
      console.log(`[DoctorSummary] Unique days in data: ${uniqueDays.length} (${uniqueDays[0]} to ${uniqueDays[uniqueDays.length - 1]})`)
      console.log(`[DoctorSummary] Unique metric_keys: ${uniqueMetrics.length}`)
      console.log(`[DoctorSummary] All metric_keys:`, uniqueMetrics)
      
      // Count records per metric
      const metricCounts: { [key: string]: number } = {}
      dailyData.forEach(d => {
        metricCounts[d.metric_key] = (metricCounts[d.metric_key] || 0) + 1
      })
      console.log(`[DoctorSummary] Records per metric:`, metricCounts)
      
      // Check for SpO2 data
      const spo2Data = dailyData.filter(d => 
        d.metric_key === 'spo2_percentage_average' || 
        d.metric_key === 'breathing_disturbance_index'
      )
      if (spo2Data.length > 0) {
        console.log(`[DoctorSummary] Found ${spo2Data.length} SpO2/Breathing records`)
      } else {
        console.warn(`[DoctorSummary] NO SpO2/Breathing data found`)
      }
      
      // Check for common sleep metrics
      const sleepMetrics = ['sleep_duration', 'sleep_total_sleep_duration_seconds', 'sleep_efficiency', 'rem_sleep_percentage', 'deep_sleep_percentage']
      const foundSleepMetrics = sleepMetrics.filter(m => metricCounts[m])
      console.log(`[DoctorSummary] Sleep metrics found: ${foundSleepMetrics.length}/${sleepMetrics.length}`, foundSleepMetrics)
      
      // Check for cardiovascular metrics
      const cvMetrics = ['resting_heart_rate', 'hrv_rmssd', 'sleep_lowest_heart_rate', 'sleep_average_hrv']
      const foundCvMetrics = cvMetrics.filter(m => metricCounts[m])
      console.log(`[DoctorSummary] Cardiovascular metrics found: ${foundCvMetrics.length}/${cvMetrics.length}`, foundCvMetrics)
      
      // Check for activity metrics
      const activityMetrics = ['steps', 'sedentary_time', 'sedentary_time_seconds']
      const foundActivityMetrics = activityMetrics.filter(m => metricCounts[m])
      console.log(`[DoctorSummary] Activity metrics found: ${foundActivityMetrics.length}/${activityMetrics.length}`, foundActivityMetrics)
    } else {
      console.error(`[DoctorSummary] NO DATA FOUND in database for user ${user.id} from ${startDateStr}`)
    }

    // Check if we have any data at all
    if (!dailyData || dailyData.length === 0) {
      console.error(`[DoctorSummary] No data found for user ${user.id}. User may need to sync Oura data first.`)
      return NextResponse.json({
        error: 'No data available. Please sync your Oura data first.',
        summary: {
          sleepTable: [],
          cardiovascularTable: [],
          activityTable: []
        },
        metadata: {
          patientEmail: user.email || '',
          reportDate: now.toISOString().split('T')[0],
          dataPeriod: { start: '', end: '', days: 0 },
          referenceRange: { start: '', end: '', days: 0 }
        }
      })
    }
    
    // Calculate all metrics
    const metrics = calculateReportMetrics(dailyData || [])
    
    console.log(`[DoctorSummary] Calculated ${metrics.length} total metrics from ${dailyData.length} data records`)
    if (metrics.length > 0) {
      console.log(`[DoctorSummary] Sample calculated metrics:`, metrics.slice(0, 5).map(m => ({
        metric: m.metric,
        result: m.result_display,
        hasReference: m.reference_display !== '—'
      })))
    } else {
      console.error(`[DoctorSummary] WARNING: No metrics calculated from ${dailyData.length} data records!`)
    }
    
    // Debug: Check if SpO2 metrics were calculated
    const spo2Metrics = metrics.filter(m => {
      const n = m.metric.toLowerCase()
      return n.includes('spo2') || n.includes('breathing') || n.includes('disturbance')
    })
    if (spo2Metrics.length > 0) {
      console.log(`[DoctorSummary] Calculated ${spo2Metrics.length} SpO2/Breathing metrics:`, spo2Metrics.map(m => m.metric))
    } else {
      console.warn(`[DoctorSummary] NO SpO2/Breathing metrics calculated from ${metrics.length} total metrics`)
    }
    
    // Format as doctor-friendly summary
    const summary = formatDoctorSummary(metrics)
    
    // Debug: Log what was included in the summary
    console.log(`[DoctorSummary] Summary tables:`, {
      sleep: summary.sleepTable.length,
      cardiovascular: summary.cardiovascularTable.length,
      activity: summary.activityTable.length,
      total: summary.sleepTable.length + summary.cardiovascularTable.length + summary.activityTable.length
    })
    
    if (summary.sleepTable.length === 0 && summary.cardiovascularTable.length === 0 && summary.activityTable.length === 0) {
      console.error(`[DoctorSummary] WARNING: All summary tables are empty! This suggests a filtering issue.`)
      console.log(`[DoctorSummary] All calculated metrics:`, metrics.map(m => m.metric))
    }
    
    // Calculate date range for the report (reuse 'now' from above)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]
    }
    
    // Find the earliest data date for reference range
    let earliestDate: string | null = null
    if (dailyData && dailyData.length > 0) {
      const dates = dailyData.map(d => d.day).filter(Boolean)
      if (dates.length > 0) {
        earliestDate = dates.sort()[0]
      }
    }
    
    const reportDate = formatDate(now)
    const periodStart = formatDate(sevenDaysAgo)
    const periodEnd = formatDate(yesterday)
    const daysInPeriod = Math.ceil((yesterday.getTime() - sevenDaysAgo.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    // Reference range: use exactly 30 days before the 7-day period (or as much as available if less than 30 days)
    // Calculate 30 days before the 7-day period start
    const refEndDate = new Date(sevenDaysAgo)
    refEndDate.setDate(refEndDate.getDate() - 1) // Day before 7-day period starts
    const refStartDate = new Date(refEndDate)
    refStartDate.setDate(refStartDate.getDate() - 29) // 30 days total (inclusive)
    
    // Use 30 days before the 7-day period, or earliest available if less than 30 days
    const idealRefStart = formatDate(refStartDate)
    const refStart = earliestDate && earliestDate < idealRefStart ? earliestDate : idealRefStart
    
    const refEnd = formatDate(refEndDate)
    const refDays = Math.ceil((new Date(refEnd).getTime() - new Date(refStart).getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    // If we have 30+ days of data, show 30. Otherwise show actual days available
    const actualRefDays = refDays >= 30 ? 30 : refDays
    
    return NextResponse.json({ 
      summary,
      metadata: {
        patientEmail: user.email || '',
        reportDate: reportDate,
        dataPeriod: {
          start: periodStart,
          end: periodEnd,
          days: daysInPeriod,
        },
        referenceRange: {
          start: refStart,
          end: refEnd,
          days: actualRefDays,
        }
      }
    })
  } catch (error: any) {
    console.error('Doctor summary error:', error)
    return NextResponse.json(
      { error: error.message || 'Doctor summary failed' },
      { status: 500 }
    )
  }
}
