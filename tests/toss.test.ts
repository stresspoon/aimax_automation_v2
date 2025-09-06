import { describe, it, expect } from 'vitest'
import { computeEventHash, verifyTossSignature } from '../src/lib/payments/toss'
import crypto from 'crypto'

describe('toss helpers', () => {
  it('computes stable sha256 hash', () => {
    const h1 = computeEventHash('{"a":1}')
    const h2 = computeEventHash('{"a":1}')
    expect(h1).toBe(h2)
  })

  it('validates signature', () => {
    const secret = 'test_secret'
    const body = '{"x":123}'
    const sig = crypto.createHmac('sha256', secret).update(body).digest('base64')
    const ok = verifyTossSignature(body, sig, secret)
    expect(ok).toBe(true)
  })

  it('rejects invalid signature', () => {
    const res = verifyTossSignature('{"x":1}', 'invalid', 'secret')
    expect(res).toBe(false)
  })
})
