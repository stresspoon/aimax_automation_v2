import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseMetrics } from '@/lib/sns/scrape'
import { evaluateSelection } from '@/lib/selection/policy'
import { sendEmail } from '@/lib/email/sender'

// Expecting Google Forms/Apps Script webhook to POST JSON
// Field mapping should align with the Google Sheet columns
const BodySchema = z.object({
  timestamp: z.string().optional(),
  name: z.string(),
  phone: z.string().optional().default(''),
  email: z.string().email(),
  source: z.string().optional().default(''),
  threads_url: z.string().url().optional().default(''),
  instagram_url: z.string().url().optional().default(''),
  blog_url: z.string().url().optional().default(''),
  video_consent: z.string().optional(), // '네 가능합니다' 등 자연어
  privacy_consent: z.string().optional(), // '동의합니다'
})

function normalizeConsent(value?: string): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return ['y', 'yes', 'true', '1', '동의', '동의합니다', '네', '네 가능합니다', '가능'].some((k) => v.includes(k))
}

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const body = BodySchema.parse(json)

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('applicants')
      .insert({
        submitted_at: body.timestamp ? new Date(body.timestamp).toISOString() : undefined,
        name: body.name,
        phone: body.phone,
        email: body.email,
        source: body.source,
        threads_url: body.threads_url,
        instagram_url: body.instagram_url,
        blog_url: body.blog_url,
        video_consent: normalizeConsent(body.video_consent),
        privacy_consent: normalizeConsent(body.privacy_consent),
        selection_status: 'pending',
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    }

    // Inline selection processing
    const urls = [data.threads_url, data.instagram_url, data.blog_url].filter(Boolean)
    const metricsList = await Promise.all(urls.map((u: string) => parseMetrics(u)))
    const decision = evaluateSelection({
      name: data.name,
      email: data.email,
      videoConsent: !!data.video_consent,
      privacyConsent: !!data.privacy_consent,
      metricsList,
    })

    const { data: updated } = await admin
      .from('applicants')
      .update({
        metrics: metricsList,
        selection_status: decision.selected ? 'selected' : 'rejected',
        selection_reason: decision.reason,
        processed_at: new Date().toISOString(),
      })
      .eq('id', data.id)
      .select('*')
      .single()

    // Send email (best-effort)
    const subject = decision.selected ? 'AIMAX 체험단 선정 안내' : 'AIMAX 체험단 비선정 안내'
    const html = decision.selected
      ? `<p>${data.name}님, 축하합니다! 자동 선별 기준을 충족하여 선정되셨습니다.</p>`
      : `<p>${data.name}님, 아쉽지만 이번에는 기준을 충족하지 못해 비선정되었습니다.</p>`
    await sendEmail({
      to: data.email,
      templateId: 'generic',
      payload: { subject, html, text: subject },
    })

    return NextResponse.json({ ok: true, applicant: updated || data, metricsList, decision })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 })
  }
}


