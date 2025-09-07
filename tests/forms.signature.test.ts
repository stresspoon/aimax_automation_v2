import { describe, it, expect } from 'vitest'
import { verifyFormsSignature } from '../src/lib/forms/signature'
import crypto from 'crypto'

describe('Forms signature', () => {
  it('verifies hex signature', () => {
    const body = '{"a":1}'
    const secret = 's'
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex')
    expect(verifyFormsSignature(body, sig, secret)).toBe(true)
  })

  it('verifies base64 signature', () => {
    const body = '{"a":2}'
    const secret = 's2'
    const sig = crypto.createHmac('sha256', secret).update(body).digest('base64')
    expect(verifyFormsSignature(body, sig, secret)).toBe(true)
  })

  it('rejects wrong signature', () => {
    expect(verifyFormsSignature('{"x":1}', 'nope', 's')).toBe(false)
  })
})

