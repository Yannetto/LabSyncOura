import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceSupabase = createServiceClient()
    
    // Get user's IP and user agent for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Delete all user data in order (respecting foreign key constraints)
    
    // 1. Delete all reports from storage
    const { data: reports } = await serviceSupabase
      .from('reports')
      .select('id')
      .eq('user_id', user.id)

    if (reports && reports.length > 0) {
      // Delete from storage bucket
      const reportIds = reports.map(r => r.id)
      for (const reportId of reportIds) {
        try {
          await serviceSupabase.storage
            .from('reports')
            .remove([`${user.id}/${reportId}.json`])
        } catch (storageError) {
          // Continue even if storage deletion fails
          console.warn(`[DeleteAllData] Failed to delete report ${reportId} from storage:`, storageError)
        }
      }
    }

    // 2. Delete all reports from database
    const { error: reportsError } = await serviceSupabase
      .from('reports')
      .delete()
      .eq('user_id', user.id)

    if (reportsError) {
      console.error('[DeleteAllData] Error deleting reports:', reportsError)
      throw reportsError
    }

    // 3. Delete all Oura daily data
    const { error: dailyError } = await serviceSupabase
      .from('oura_daily')
      .delete()
      .eq('user_id', user.id)

    if (dailyError) {
      console.error('[DeleteAllData] Error deleting oura_daily:', dailyError)
      throw dailyError
    }

    // 4. Delete Oura tokens
    const { error: tokensError } = await serviceSupabase
      .from('oura_tokens')
      .delete()
      .eq('user_id', user.id)

    if (tokensError) {
      console.error('[DeleteAllData] Error deleting tokens:', tokensError)
      throw tokensError
    }

    // 5. Log the action
    await serviceSupabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'all_data_deleted',
        resource_type: 'user_data',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { 
          timestamp: new Date().toISOString(),
          reports_deleted: reports?.length || 0
        }
      })

    return NextResponse.json({ 
      ok: true,
      message: 'All data deleted successfully'
    })
  } catch (error: any) {
    console.error('Delete all data error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete data' },
      { status: 500 }
    )
  }
}
