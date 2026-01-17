import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceSupabase = createServiceClient()
    
    // Get all user data
    const [profile, ouraDaily, reports, auditLogs] = await Promise.all([
      serviceSupabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single(),
      serviceSupabase
        .from('oura_daily')
        .select('*')
        .eq('user_id', user.id)
        .order('day', { ascending: false }),
      serviceSupabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      serviceSupabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000), // Limit audit logs
    ])

    // Check for Oura connection status (without exposing tokens)
    const { data: ouraTokens } = await serviceSupabase
      .from('oura_tokens')
      .select('created_at, updated_at, expires_at')
      .eq('user_id', user.id)
      .single()

    const exportData = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      profile: profile.data,
      oura_connection: ouraTokens ? {
        connected: true,
        connected_at: ouraTokens.created_at,
        last_updated: ouraTokens.updated_at,
        expires_at: ouraTokens.expires_at,
      } : { connected: false },
      oura_data: {
        total_records: ouraDaily.data?.length || 0,
        records: ouraDaily.data || [],
      },
      reports: {
        total: reports.data?.length || 0,
        reports: reports.data?.map(r => ({
          id: r.id,
          title: r.title,
          period_start: r.period_start,
          period_end: r.period_end,
          report_type: r.report_type,
          created_at: r.created_at,
          report_data: r.report_data,
        })) || [],
      },
      audit_logs: {
        total: auditLogs.data?.length || 0,
        logs: auditLogs.data || [],
      },
    }

    // Log the export
    await serviceSupabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'data_exported',
        resource_type: 'user_data',
        metadata: { 
          timestamp: new Date().toISOString(),
          records_exported: {
            oura_daily: ouraDaily.data?.length || 0,
            reports: reports.data?.length || 0,
            audit_logs: auditLogs.data?.length || 0,
          }
        }
      })

    // Return as JSON download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="oura-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error: any) {
    console.error('Export data error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to export data' },
      { status: 500 }
    )
  }
}
