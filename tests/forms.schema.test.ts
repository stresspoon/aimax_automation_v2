import { describe, it, expect } from 'vitest'
import { FormWebhookSchema, normalizeFormPayload } from '../src/app/api/forms/webhook/schema'

describe('Forms webhook schema', () => {
  it('normalizes english keys', () => {
    const raw = { projectId: 'p1', name: 'N', email: 'E', phone: 'P', threadsUrl: 'T', instagramUrl: 'I', blogUrl: 'B' }
    const parsed = FormWebhookSchema.parse(raw)
    const n = normalizeFormPayload(parsed)
    expect(n).toMatchObject({ projectId: 'p1', name: 'N', email: 'E', phone: 'P', threadsUrl: 'T', instagramUrl: 'I', blogUrl: 'B' })
  })

  it('normalizes korean keys', () => {
    const raw = { projectId: 'p2', 성함: '홍길동', 이메일: 'a@b.c', 연락처: '010', '스레드 URL': 't', '인스타그램 URL': 'i', '블로그 URL': 'b' }
    const parsed = FormWebhookSchema.parse(raw as any)
    const n = normalizeFormPayload(parsed)
    expect(n).toMatchObject({ projectId: 'p2', name: '홍길동', email: 'a@b.c', phone: '010', threadsUrl: 't', instagramUrl: 'i', blogUrl: 'b' })
  })

  it('fills timestamp default', () => {
    const parsed = FormWebhookSchema.parse({})
    const n = normalizeFormPayload(parsed)
    expect(typeof n.timestamp).toBe('string')
  })
})

