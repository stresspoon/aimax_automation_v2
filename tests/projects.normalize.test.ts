import { describe, it, expect } from 'vitest'
import { normalizeProjectData } from '@/lib/projects/normalize'

describe('normalizeProjectData', () => {
  it('fills defaults for full structure', () => {
    const input = { step1: {}, step2: {}, step3: {} }
    const out = normalizeProjectData(input)
    expect(out.step1).toBeDefined()
    expect(out.step2.selectionCriteria).toEqual({ threads: 500, blog: 300, instagram: 1000 })
    expect(out.step3.targetType).toBe('selected')
  })

  it('normalizes legacy step2-only payloads', () => {
    const input = { candidates: [{ name: 'A', email: 'a@x' }], isRunning: true }
    const out = normalizeProjectData(input)
    expect(Array.isArray(out.step2.candidates)).toBe(true)
    expect(out.step2.isRunning).toBe(true)
    expect(out.step1.contentType).toBe('blog')
  })
})

