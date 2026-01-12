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

    // Soft delete: Mark profile as deleted
    const { error: updateError } = await serviceSupabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      console.error('[DeleteAccount] Error soft-deleting profile:', updateError)
      throw updateError
    }

    // Delete all user data (same as delete-all-data endpoint)
    // Delete reports
    const { data: reports } = await serviceSupabase
      .from('reports')
      .select('id')
      .eq('user_id', user.id)

    if (reports && reports.length > 0) {
      for (const report of reports) {
        try {
          await serviceSupabase.storage
            .from('reports')
            .remove([`${user.id}/${report.id}.json`])
        } catch (storageError) {
          console.warn(`[DeleteAccount] Failed to delete report ${report.id} from storage:`, storageError)
        }
      }
    }

    await serviceSupabase
      .from('reports')
      .delete()
      .eq('user_id', user.id)

    // Delete Oura data
    await serviceSupabase
      .from('oura_daily')
      .delete()
      .eq('user_id', user.id)

    await serviceSupabase
      .from('oura_tokens')
      .delete()
      .eq('user_id', user.id)

    // Log the action
    await serviceSupabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'account_deleted',
        resource_type: 'account',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { 
          timestamp: new Date().toISOString(),
          reports_deleted: reports?.length || 0
        }
      })

    // Note: Auth user deletion requires admin API access
    // The profile is soft-deleted, and the auth user can be deleted via Supabase dashboard
    // or by implementing admin API access with proper service role key
    // For now, we soft-delete the profile and all associated data

    return NextResponse.json({ 
      ok: true,
      message: 'Account deleted successfully'
    })
  } catch (error: any) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    )
  }
}
