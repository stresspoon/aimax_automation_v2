import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseMetrics } from '@/lib/sns/scrape'

const BodySchema = z.object({
  candidate: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    threadsUrl: z.string().url().optional().or(z.literal('')).default(''),
    instagramUrl: z.string().url().optional().or(z.literal('')).default(''),
    blogUrl: z.string().url().optional().or(z.literal('')).default(''),
  }),
  criteria: z.object({
    threads: z.number().default(500),
    blog: z.number().default(300),
    instagram: z.number().default(1000),
  }).optional(),
  channel: z.enum(['threads','blog','instagram','all']).optional().default('all'),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const body = BodySchema.parse(json)
    let threads = 0, blog = 0, instagram = 0
    const ch = body.channel
    if (ch === 'threads' || ch === 'all') {
      if (body.candidate.threadsUrl) {
        try {
          const m = await parseMetrics(body.candidate.threadsUrl)
          threads = m.followers || 0
        } catch (e) {
          console.error('threads parse error:', e)
        }
      }
    }
    if (ch === 'blog' || ch === 'all') {
      if (body.candidate.blogUrl) {
        try {
          const m = await parseMetrics(body.candidate.blogUrl)
          blog = m.neighbors || 0
        } catch (e) {
          console.error('blog parse error:', e)
        }
      }
    }
    if (ch === 'instagram' || ch === 'all') {
      if (body.candidate.instagramUrl) {
        try {
          const m = await parseMetrics(body.candidate.instagramUrl)
          instagram = m.followers || 0
        } catch (e) {
          console.error('instagram parse error:', e)
        }
      }
    }
    const c = body.criteria || { threads: 500, blog: 300, instagram: 1000 }
    const selected = threads >= c.threads || blog >= c.blog || instagram >= c.instagram
    return NextResponse.json({ threads, blog, instagram, selected })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}


