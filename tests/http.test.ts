import { describe, it, expect } from 'vitest'
import { ok, created, badRequest, unauthorized, notFound, serverError, forbidden } from '../src/lib/http'

describe('http helpers', () => {
  it('ok returns 200 with payload', async () => {
    const res = ok({ a: 1 })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ a: 1 })
  })

  it('created returns 201', async () => {
    const res = created({ id: 'x' })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'x' })
  })

  it('badRequest returns 400 with error', async () => {
    const res = badRequest('Invalid')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid' })
  })

  it('unauthorized returns 401', async () => {
    const res = unauthorized()
    expect(res.status).toBe(401)
  })

  it('forbidden returns 403', async () => {
    const res = forbidden('nope')
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'nope' })
  })

  it('notFound returns 404', async () => {
    const res = notFound()
    expect(res.status).toBe(404)
  })

  it('serverError returns 500', async () => {
    const res = serverError()
    expect(res.status).toBe(500)
  })
})

