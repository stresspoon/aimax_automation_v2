import { z } from 'zod'

// 웹훅 원본 페이로드: 다양한 키를 허용
export const FormWebhookSchema = z.object({
  projectId: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  threadsUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  blogUrl: z.string().optional(),
  // 한국어 키 지원
  성함: z.string().optional(),
  이메일: z.string().optional(),
  연락처: z.string().optional(),
  '스레드 URL': z.string().optional(),
  '인스타그램 URL': z.string().optional(),
  '블로그 URL': z.string().optional(),
}).passthrough()

export type RawFormPayload = z.infer<typeof FormWebhookSchema>

export function normalizeFormPayload(input: RawFormPayload) {
  // timestamp 표준화(ISO)
  let timestamp: string
  if (typeof input.timestamp === 'number') {
    timestamp = new Date(input.timestamp).toISOString()
  } else if (typeof input.timestamp === 'string') {
    const d = new Date(input.timestamp)
    timestamp = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
  } else {
    timestamp = new Date().toISOString()
  }

  const name = input.name ?? (input as any)['성함'] ?? ''
  const email = input.email ?? (input as any)['이메일'] ?? ''
  const phone = input.phone ?? (input as any)['연락처'] ?? ''
  const threadsUrl = input.threadsUrl ?? (input as any)['스레드 URL'] ?? ''
  const instagramUrl = input.instagramUrl ?? (input as any)['인스타그램 URL'] ?? ''
  const blogUrl = input.blogUrl ?? (input as any)['블로그 URL'] ?? ''

  return {
    projectId: input.projectId,
    timestamp,
    name,
    email,
    phone,
    threadsUrl,
    instagramUrl,
    blogUrl,
  }
}

