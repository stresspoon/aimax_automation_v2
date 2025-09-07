import { describe, it, expect, vi } from 'vitest'
import { fetchJSON } from '../src/lib/httpClient'

describe('fetchJSON', () => {
  it('returns JSON on success', async () => {
    const res = new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    const spy = vi.spyOn(global, 'fetch' as any).mockResolvedValue(res as any)
    const data = await fetchJSON('http://example.com')
    expect(data).toEqual({ ok: true })
    spy.mockRestore()
  })

  it('throws with message from error json', async () => {
    const res = new Response(JSON.stringify({ error: 'Bad' }), { status: 400, headers: { 'content-type': 'application/json' } })
    const spy = vi.spyOn(global, 'fetch' as any).mockResolvedValue(res as any)
    await expect(fetchJSON('http://example.com')).rejects.toHaveProperty('message', 'Bad')
    spy.mockRestore()
  })

  it('times out when fetch stalls and aborts', async () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(global, 'fetch' as any).mockImplementation((_: any, init: any) => {
      return new Promise((_resolve, reject) => {
        // reject on abort to avoid dangling promise
        init?.signal?.addEventListener('abort', () => {
          const err: any = new Error('Aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
    })
    const p = fetchJSON('http://example.com', { timeoutMs: 10 }).catch((e) => e)
    await vi.advanceTimersByTimeAsync(15)
    const err: any = await p
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('Request timeout')
    spy.mockRestore()
    vi.useRealTimers()
  })
})
