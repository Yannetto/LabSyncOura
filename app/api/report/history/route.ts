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
    
    const { data: reports, error: fetchError } = await serviceSupabase
      .from('reports')
      .select('id, title, period_start, period_end, report_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (fetchError) {
      console.error('[ReportHistory] Error fetching reports:', fetchError)
      throw fetchError
    }

    return NextResponse.json({ 
      reports: reports || []
    })
  } catch (error: any) {
    console.error('Report history error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch report history' },
      { status: 500 }
    )
  }
}
