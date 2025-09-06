import { NextResponse } from 'next/server'

type Json = Record<string, any> | any[] | null

export function ok(payload: Json, init?: ResponseInit) {
  return NextResponse.json(payload, { status: 200, ...(init || {}) })
}

export function created(payload: Json) {
  return NextResponse.json(payload, { status: 201 })
}

export function badRequest(message = 'Bad request', details?: any) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status: 400 })
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 })
}

export function tooMany(message = 'Too many requests', retryAfterSec?: number) {
  const headers: Record<string, string> = {}
  if (retryAfterSec && retryAfterSec > 0) headers['Retry-After'] = String(retryAfterSec)
  return NextResponse.json({ error: message }, { status: 429, headers })
}

export function conflict(message = 'Conflict') {
  return NextResponse.json({ error: message }, { status: 409 })
}
