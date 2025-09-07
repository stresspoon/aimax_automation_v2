import { describe, it, expect } from 'vitest'
import { mergeCandidatesSafely } from '@/lib/candidates/merge'

describe('mergeCandidatesSafely', () => {
  it('preserves previous non-zero metrics when next is zero', () => {
    const prev = [
      { name: 'A', email: 'a@x', threads: 500, blog: 100, instagram: 200 },
    ]
    const next = [
      { name: 'A', email: 'a@x', threads: 0, blog: 0, instagram: 0 },
    ]
    const merged = mergeCandidatesSafely(prev as any, next as any)
    expect(merged[0].threads).toBe(500)
    expect(merged[0].blog).toBe(100)
    expect(merged[0].instagram).toBe(200)
  })

  it('takes new positive metrics over previous values', () => {
    const prev = [{ name: 'A', email: 'a@x', threads: 10 }]
    const next = [{ name: 'A', email: 'a@x', threads: 15 }]
    const merged = mergeCandidatesSafely(prev as any, next as any)
    expect(merged[0].threads).toBe(15)
  })
})

