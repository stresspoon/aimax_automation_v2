import { describe, it, expect } from 'vitest'
import { ProjectCreateSchema, ProjectListQuerySchema, ProjectUpdateSchema } from '../src/app/api/projects/schema'

describe('Project schemas', () => {
  it('valid create payload passes', () => {
    const parsed = ProjectCreateSchema.parse({
      campaign_id: 'abc',
      type: 'customer_acquisition',
      step: 2,
      data: { x: 1 },
    })
    expect(parsed).toEqual({ campaign_id: 'abc', type: 'customer_acquisition', step: 2, data: { x: 1 } })
  })

  it('defaults step and data', () => {
    const parsed = ProjectCreateSchema.parse({ campaign_id: 'abc', type: 'video' })
    expect(parsed.step).toBe(1)
    expect(parsed.data).toEqual({})
  })

  it('invalid type fails', () => {
    const res = ProjectCreateSchema.safeParse({ campaign_id: 'abc', type: 'unknown' })
    expect(res.success).toBe(false)
  })

  it('list query optional fields', () => {
    const parsed = ProjectListQuerySchema.parse({})
    expect(parsed).toEqual({})
  })

  it('update schema strict disallows unknown fields', () => {
    const res = ProjectUpdateSchema.safeParse({ step: 3, notAllowed: true } as any)
    expect(res.success).toBe(false)
  })
})

