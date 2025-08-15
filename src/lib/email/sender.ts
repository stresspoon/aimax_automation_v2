import type { EmailTemplateId, RenderedEmail } from './templates'
import { renderTemplate } from './templates'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendViaGmailAsUser } from './gmail'

export interface SendEmailParams {
  to: string
  templateId?: EmailTemplateId
  payload?: Record<string, unknown>
}

export interface EmailProviderResponse {
  ok: boolean
  provider: 'sendgrid'
  messageId?: string
  error?: string
}

function buildRenderedEmail(params: SendEmailParams): RenderedEmail {
  const id = params.templateId || 'generic'
  return renderTemplate(id, params.payload)
}

export async function sendEmail(params: SendEmailParams): Promise<EmailProviderResponse> {
  const rendered = buildRenderedEmail(params)

  // 1) 사용자 연결이 있으면 Gmail API로 발송(From=사용자)
  try {
    const admin = createAdminClient()
    const { data: userRes } = await admin.auth.getUser()
    const userId = userRes?.user?.id
    if (userId) {
      await sendViaGmailAsUser({ userId, to: params.to, subject: rendered.subject, html: rendered.html })
      return { ok: true, provider: 'sendgrid' }
    }
  } catch {}

  // 2) 폴백: 환경변수 없으면 no-op, 있으면 SendGrid로 발송
  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.EMAIL_FROM || 'no-reply@aimax.app'
  if (!apiKey) {
    return { ok: false, provider: 'sendgrid', error: 'No provider available' }
  }
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.to }] }],
      from: { email: fromEmail, name: 'AIMAX' },
      subject: rendered.subject,
      content: [
        { type: 'text/plain', value: rendered.text || '' },
        { type: 'text/html', value: rendered.html }
      ]
    })
  })
  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    return { ok: false, provider: 'sendgrid', error: `HTTP ${res.status} ${errorText}` }
  }
  const messageId = res.headers.get('x-message-id') || undefined
  return { ok: true, provider: 'sendgrid', messageId }
}



