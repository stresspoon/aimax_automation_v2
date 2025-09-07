type Bucket = { count: number; resetAt: number }
const store = new Map<string, Bucket>()

export interface RateLimitOptions {
  windowMs?: number
  max?: number
}

export function rateLimit(key: string, opts: RateLimitOptions = {}) {
  const windowMs = opts.windowMs ?? 60_000
  const max = opts.max ?? 5
  const now = Date.now()
  const b = store.get(key)
  if (!b || b.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs }
    store.set(key, bucket)
    return { allowed: true, remaining: max - 1, resetAt: bucket.resetAt, retryAfterSec: 0 }
  }
  if (b.count >= max) {
    const retryAfterSec = Math.ceil((b.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, resetAt: b.resetAt, retryAfterSec }
  }
  b.count += 1
  store.set(key, b)
  return { allowed: true, remaining: max - b.count, resetAt: b.resetAt, retryAfterSec: 0 }
}

export function ipKey(request: Request, route: string) {
  const h = (name: string) => request.headers.get(name) || ''
  const fwd = h('x-forwarded-for')
  const ip = (fwd.split(',')[0] || h('x-real-ip') || 'unknown').trim()
  return `${route}:${ip}`
}

