import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceSupabase = createServiceClient()
    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const reportId = parseInt(resolvedParams.id)

    if (isNaN(reportId)) {
      console.error('[GetReport] Invalid report ID:', resolvedParams.id)
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400 }
      )
    }

    const { data: report, error: fetchError } = await serviceSupabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !report) {
      console.error('[GetReport] Report not found:', { reportId, userId: user.id, error: fetchError })
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      report: {
        id: report.id,
        title: report.title,
        period_start: report.period_start,
        period_end: report.period_end,
        report_type: report.report_type,
        created_at: report.created_at,
        report_data: report.report_data,
      }
    })
  } catch (error: any) {
    console.error('Get report error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch report' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceSupabase = createServiceClient()
    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const reportId = parseInt(resolvedParams.id)

    if (isNaN(reportId)) {
      console.error('[DeleteReport] Invalid report ID:', resolvedParams.id)
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400 }
      )
    }

    // Verify report belongs to user
    const { data: report } = await serviceSupabase
      .from('reports')
      .select('id')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single()

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Delete from storage
    try {
      await serviceSupabase.storage
        .from('reports')
        .remove([`${user.id}/${reportId}.json`])
    } catch (storageError) {
      // Continue even if storage deletion fails
      console.warn(`[DeleteReport] Failed to delete report ${reportId} from storage:`, storageError)
    }

    // Delete from database
    const { error: deleteError } = await serviceSupabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('[DeleteReport] Error deleting report:', deleteError)
      throw deleteError
    }

    // Log the action
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await serviceSupabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'report_deleted',
        resource_type: 'report',
        resource_id: String(reportId),
        ip_address: ipAddress,
        user_agent: userAgent,
      })

    return NextResponse.json({ 
      ok: true,
      message: 'Report deleted successfully'
    })
  } catch (error: any) {
    console.error('Delete report error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete report' },
      { status: 500 }
    )
  }
}
