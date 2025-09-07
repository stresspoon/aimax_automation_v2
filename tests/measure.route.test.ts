import { describe, it, expect, vi, beforeEach } from 'vitest'

// Force-enable Sheets integration for tests
vi.mock('@/lib/flags', () => ({
  isSheetsIntegrationEnabled: () => true,
}))

// Partially mock sns/scrape: keep normalizeUrl real, stub parseMetrics
vi.mock('@/lib/sns/scrape', async (orig) => {
  const actual = await (orig as any).importActual<typeof import('@/lib/sns/scrape')>('@/lib/sns/scrape')
  return {
    ...actual,
    parseMetrics: vi.fn(async (url: string) => ({ platform: 'instagram', url, followers: 1200 })),
  }
})

import { POST } from '@/app/api/sheets/measure/route'
import { parseMetrics, normalizeUrl } from '@/lib/sns/scrape'

describe('measure API route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns selected=true when instagram followers meet criteria', async () => {
    const body = {
      candidate: { instagramUrl: 'nike' },
      criteria: { threads: 500, blog: 300, instagram: 1000 },
      channel: 'instagram' as const,
    }

    const req = new Request('http://localhost/api/sheets/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const res = await POST(req)
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(json.instagram).toBe(1200)
    expect(json.selected).toBe(true)

    // ensure parseMetrics called with normalized instagram URL
    const normalized = normalizeUrl('nike', 'instagram')
    expect(vi.mocked(parseMetrics)).toHaveBeenCalledWith(normalized)
  })

  it('returns selected=false when followers below criteria', async () => {
    vi.mocked(parseMetrics).mockResolvedValueOnce({ platform: 'instagram', url: 'x', followers: 800 })
    const body = {
      candidate: { instagramUrl: 'nike' },
      criteria: { threads: 500, blog: 300, instagram: 1000 },
      channel: 'instagram' as const,
    }
    const req = new Request('http://localhost/api/sheets/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const res = await POST(req)
    const json = await res.json()
    expect(json.instagram).toBe(800)
    expect(json.selected).toBe(false)
  })
})

