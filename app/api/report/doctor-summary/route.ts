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
    
    // Calculate date range - we need last 37 days (7 days for report + 30 days for reference)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const thirtySevenDaysAgo = new Date(now)
    thirtySevenDaysAgo.setDate(thirtySevenDaysAgo.getDate() - 37)
    const startDateStr = thirtySevenDaysAgo.toISOString().split('T')[0]
    
    // Fetch all data for the last 37 days (should be enough for 7-day report + 30-day reference)
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

    // Debug: Check if SpO2 data exists in fetched data
    const spo2Data = (dailyData || []).filter(d => 
      d.metric_key === 'spo2_percentage_average' || 
      d.metric_key === 'breathing_disturbance_index'
    )
    if (spo2Data.length > 0) {
      console.log(`[DoctorSummary] Found ${spo2Data.length} SpO2/Breathing records in database`)
    } else {
      console.warn(`[DoctorSummary] NO SpO2/Breathing data found in database. Total records fetched: ${dailyData?.length || 0}`)
      if (dailyData && dailyData.length > 0) {
        const uniqueMetrics = [...new Set(dailyData.map(d => d.metric_key))].sort()
        console.log(`[DoctorSummary] Available metric_keys:`, uniqueMetrics)
      }
    }

    // Calculate all metrics
    const metrics = calculateReportMetrics(dailyData || [])
    
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
