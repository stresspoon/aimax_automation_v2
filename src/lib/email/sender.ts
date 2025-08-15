import type { EmailTemplateId, RenderedEmail } from './templates'
import { renderTemplate } from './templates'

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
  const provider = process.env.EMAIL_PROVIDER || 'sendgrid'
  if (provider !== 'sendgrid') {
    return { ok: false, provider: 'sendgrid', error: 'Unsupported provider' }
  }

  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.EMAIL_FROM || 'no-reply@aimax.app'

  // 환경변수 누락 시 no-op으로 처리해 런타임 실패 방지
  if (!apiKey) {
    return { ok: false, provider: 'sendgrid', error: 'SENDGRID_API_KEY is missing' }
  }

  const rendered = buildRenderedEmail(params)

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


