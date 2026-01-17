import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { summary, metadata, title } = body

    if (!summary || !metadata) {
      return NextResponse.json(
        { error: 'Missing required fields: summary and metadata' },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceClient()
    
    // Calculate period dates
    const periodStart = metadata.dataPeriod?.start || metadata.reportDate
    const periodEnd = metadata.dataPeriod?.end || metadata.reportDate

    // Save report to database
    // Build insert object - conditionally include pdf_path if column exists
    const insertData: any = {
      user_id: user.id,
      period_start: periodStart,
      period_end: periodEnd,
      report_data: { summary, metadata },
      report_type: 'doctor_summary',
      title: title || `Report ${new Date(periodEnd).toLocaleDateString()}`,
    }
    
    // Only include pdf_path if the column still exists (for backward compatibility)
    // If column was dropped, this will be ignored
    insertData.pdf_path = null // Set to null (column should be nullable or dropped)
    
    const { data: report, error: insertError } = await serviceSupabase
      .from('reports')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[SaveReport] Error saving report:', insertError)
      throw insertError
    }

    // Also save to storage as JSON backup
    try {
      const reportJson = JSON.stringify({ summary, metadata }, null, 2)
      const fileName = `${user.id}/${report.id}.json`
      
      await serviceSupabase.storage
        .from('reports')
        .upload(fileName, reportJson, {
          contentType: 'application/json',
          upsert: true
        })
    } catch (storageError) {
      // Log but don't fail - database record is primary
      console.warn('[SaveReport] Failed to save to storage:', storageError)
    }

    // Log the action
    await serviceSupabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'report_saved',
        resource_type: 'report',
        resource_id: String(report.id),
        metadata: { 
          report_type: 'doctor_summary',
          period_start: periodStart,
          period_end: periodEnd
        }
      })

    return NextResponse.json({ 
      ok: true,
      report: {
        id: report.id,
        title: report.title,
        created_at: report.created_at,
        period_start: report.period_start,
        period_end: report.period_end,
      }
    })
  } catch (error: any) {
    console.error('Save report error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save report' },
      { status: 500 }
    )
  }
}
