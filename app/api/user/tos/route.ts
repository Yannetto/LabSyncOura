import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const CURRENT_TOS_VERSION = '1.0'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceSupabase = createServiceClient()
    
    // Ensure profile exists
    await serviceSupabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || '',
      }, {
        onConflict: 'id',
      })
    
    const { data: profile, error: fetchError } = await serviceSupabase
      .from('profiles')
      .select('tos_accepted_at, tos_version')
      .eq('id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[GetTOS] Error fetching profile:', fetchError)
      throw fetchError
    }

    const tosAccepted = !!profile?.tos_accepted_at
    const tosVersion = profile?.tos_version
    const needsAcceptance = !tosAccepted || tosVersion !== CURRENT_TOS_VERSION

    return NextResponse.json({ 
      tos_accepted: tosAccepted,
      tos_version: tosVersion,
      current_version: CURRENT_TOS_VERSION,
      needs_acceptance: needsAcceptance,
    })
  } catch (error: any) {
    console.error('Get TOS status error:', error)
    // Return default state on error (assume needs acceptance to be safe)
    return NextResponse.json({ 
      tos_accepted: false,
      tos_version: null,
      current_version: CURRENT_TOS_VERSION,
      needs_acceptance: true,
    })
  }
}

export async function POST(request: NextRequest) {
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

    // First ensure profile exists
    const { error: profileError } = await serviceSupabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || '',
      }, {
        onConflict: 'id',
      })

    if (profileError) {
      console.error('[AcceptTOS] Error creating profile:', profileError)
      // Continue anyway - profile might already exist
    }

    // Update profile with TOS acceptance
    const { error: updateError } = await serviceSupabase
      .from('profiles')
      .update({
        tos_accepted_at: new Date().toISOString(),
        tos_version: CURRENT_TOS_VERSION,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[AcceptTOS] Error updating profile with TOS:', updateError)
      // Check if it's a column doesn't exist error
      const errorMessage = updateError.message || String(updateError)
      const errorCode = (updateError as any).code
      
      if (errorMessage.includes('column') || 
          errorMessage.includes('tos_accepted_at') || 
          errorMessage.includes('tos_version') ||
          errorCode === '42703' ||
          errorCode === '42883') {
        return NextResponse.json(
          { 
            error: 'Database schema not updated',
            details: 'The tos_accepted_at and tos_version columns do not exist. Please run supabase-schema-updates.sql in your Supabase SQL Editor.',
            code: 'SCHEMA_NOT_UPDATED'
          },
          { status: 500 }
        )
      }
      throw updateError
    }

    // Log the action (don't fail if audit log fails - table might not exist yet)
    try {
      const { error: auditError } = await serviceSupabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'tos_accepted',
          resource_type: 'profile',
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { 
            tos_version: CURRENT_TOS_VERSION,
            timestamp: new Date().toISOString()
          }
        })
      
      if (auditError) {
        // Log but don't fail the request if audit logging fails (table might not exist)
        console.warn('[AcceptTOS] Failed to log audit entry (non-critical):', auditError)
      }
    } catch (auditError) {
      // Log but don't fail the request if audit logging fails
      console.warn('[AcceptTOS] Exception during audit logging (non-critical):', auditError)
    }

    console.log('[AcceptTOS] Successfully accepted TOS for user:', user.id)

    return NextResponse.json({ 
      ok: true,
      message: 'Terms of Service accepted',
      tos_version: CURRENT_TOS_VERSION,
    }, { status: 200 })
  } catch (error: any) {
    console.error('Accept TOS error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to accept Terms of Service' },
      { status: 500 }
    )
  }
}
