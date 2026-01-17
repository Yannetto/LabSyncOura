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

    // Get latest report
    const { data: report, error: fetchError } = await serviceSupabase
      .from('reports')
      .select('pdf_path')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !report) {
      return NextResponse.json({ error: 'No report found' }, { status: 404 })
    }

    // Generate signed URL (expires in 24 hours)
    const { data: signedUrlData, error: urlError } = await serviceSupabase.storage
      .from('reports')
      .createSignedUrl(report.pdf_path, 24 * 60 * 60)

    if (urlError || !signedUrlData) {
      throw urlError || new Error('Failed to generate signed URL')
    }

    return NextResponse.json({ 
      download_url: signedUrlData.signedUrl,
      pdf_path: report.pdf_path,
    })
  } catch (error: any) {
    console.error('Latest report error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get latest report' },
      { status: 500 }
    )
  }
}
