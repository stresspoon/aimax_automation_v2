import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseMetrics } from '@/lib/sns/scrape'
import { evaluateSelection } from '@/lib/selection/policy'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = createAdminClient()
    const { data: applicant, error } = await admin
      .from('applicants')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !applicant) {
      return NextResponse.json({ ok: false, error: error?.message || 'Not found' }, { status: 404 })
    }

    const urls: string[] = [applicant.threads_url, applicant.instagram_url, applicant.blog_url].filter(Boolean)
    const metricsList = await Promise.all(urls.map((u: string) => parseMetrics(u)))

    const decision = evaluateSelection({
      name: applicant.name,
      email: applicant.email,
      videoConsent: !!applicant.video_consent,
      privacyConsent: !!applicant.privacy_consent,
      metricsList,
    })

    const { data: updated, error: upErr } = await admin
      .from('applicants')
      .update({
        metrics: metricsList,
        selection_status: decision.selected ? 'selected' : 'rejected',
        selection_reason: decision.reason,
        processed_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('*')
      .single()

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, applicant: updated, metricsList, decision })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 })
  }
}


