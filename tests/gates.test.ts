import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Sheets integration gates', () => {
  const prev = process.env.ENABLE_SHEETS_INTEGRATION
  beforeEach(() => {
    process.env.ENABLE_SHEETS_INTEGRATION = 'false'
  })
  afterEach(() => {
    process.env.ENABLE_SHEETS_INTEGRATION = prev
  })

  it('forms/webhook is gated when disabled', async () => {
    const { POST } = await import('../src/app/api/forms/webhook/route')
    const res = await POST(new Request('http://localhost/api/forms/webhook', { method: 'POST', body: '{}' }))
    expect(res.status).toBe(410)
  })

  it('sheets/sync is gated when disabled', async () => {
    const { POST } = await import('../src/app/api/sheets/sync/route')
    const res = await POST(new Request('http://localhost/api/sheets/sync', { method: 'POST', body: '{}' }))
    expect(res.status).toBe(410)
  })
})
