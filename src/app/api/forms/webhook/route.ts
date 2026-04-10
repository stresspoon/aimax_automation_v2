import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { badRequest, notFound, ok, serverError, unauthorized } from '@/lib/http'
import { verifyFormsSignature } from '@/lib/forms/signature'
import { FormWebhookSchema, normalizeFormPayload } from './schema'
import { isSheetsIntegrationEnabled } from '@/lib/flags'

// Google Forms 응답을 받는 웹훅
export async function POST(req: Request) {
  try {
    if (!isSheetsIntegrationEnabled()) {
      return NextResponse.json({ error: 'Sheets integration disabled' }, { status: 410 })
    }
    const text = await req.text()

    // 서명 검증: secret 필수 (모든 환경)
    const secret = process.env.FORMS_WEBHOOK_SECRET
    if (!secret) {
      return serverError('Missing FORMS_WEBHOOK_SECRET')
    }
    const signature = req.headers.get('x-forms-signature')
    const valid = verifyFormsSignature(text, signature, secret)
    if (!valid) return unauthorized('Invalid webhook signature')

    const json = JSON.parse(text)
    const parsed = FormWebhookSchema.safeParse(json)
    if (!parsed.success) {
      return badRequest('Invalid webhook payload', parsed.error.flatten())
    }

    const normalized = normalizeFormPayload(parsed.data)

    // 프로젝트 ID 결정: body 우선, 없으면 헤더
    const projectId = normalized.projectId || req.headers.get('x-project-id') || undefined
    if (!projectId) return badRequest('Project ID required')

    // 프로젝트 존재 확인
    const supabase = await createClient()
    const { data: project } = await supabase
      .from('projects')
      .select('data')
      .eq('id', projectId)
      .single()
    if (!project) return notFound('Project not found')

    // 내부 API 호출: 동일 호스트 기반 절대 URL 구성 (네트워크 hop 최소화)
    const target = new URL('/api/sheets/sync', req.url)

    // 새 후보자 처리 (SNS 체크 포함)
    const response = await fetch(target.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        candidates: [{
          timestamp: normalized.timestamp,
          name: normalized.name,
          email: normalized.email,
          phone: normalized.phone,
          threadsUrl: normalized.threadsUrl,
          instagramUrl: normalized.instagramUrl,
          blogUrl: normalized.blogUrl,
        }],
        checkNewOnly: true,
        selectionCriteria: (project as any).data?.step2?.selectionCriteria,
      }),
    })

    const result = await response.json()
    return ok({ success: true, message: '응답이 자동으로 처리되었습니다', result })
  } catch (error) {
    console.error('Forms webhook error:', error)
    return serverError((error as Error).message || 'Forms webhook error')
  }
}
