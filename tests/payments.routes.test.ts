import { describe, it, expect, vi, beforeEach } from 'vitest'

// Helper to mock supabase server client
function mockGetUser(user: any) {
  vi.doMock('@/lib/supabase/server', () => ({
    createClient: async () => ({
      auth: {
        getUser: async () => ({ data: { user }, error: null }),
      },
    }),
  }))
}

describe('payments routes minimal', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('create: unauthorized if no user', async () => {
    mockGetUser(null)
    const mod = await import('../src/app/api/payments/create/route')
    const res = await mod.POST(new Request('http://localhost/api/payments/create', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(401)
  })

  it('create: 400 on invalid payload', async () => {
    mockGetUser({ id: 'u1' })
    const mod = await import('../src/app/api/payments/create/route')
    const res = await mod.POST(new Request('http://localhost/api/payments/create', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(400)
  })

  it('confirm: 400 on invalid payload', async () => {
    mockGetUser({ id: 'u1' })
    const mod = await import('../src/app/api/payments/confirm/route')
    const res = await mod.POST(new Request('http://localhost/api/payments/confirm', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(400)
  })
})
