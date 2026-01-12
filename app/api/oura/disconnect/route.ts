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

    // Delete Oura tokens
    const { error: tokenError } = await serviceSupabase
      .from('oura_tokens')
      .delete()
      .eq('user_id', user.id)

    if (tokenError) {
      console.error('[Disconnect] Error deleting tokens:', tokenError)
      throw tokenError
    }

    // Log the action
    await serviceSupabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'oura_disconnected',
        resource_type: 'oura_tokens',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { timestamp: new Date().toISOString() }
      })

    return NextResponse.json({ 
      ok: true,
      message: 'Oura account disconnected successfully'
    })
  } catch (error: any) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect Oura account' },
      { status: 500 }
    )
  }
}
