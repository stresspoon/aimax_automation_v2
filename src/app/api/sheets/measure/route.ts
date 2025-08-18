import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseMetrics, normalizeUrl } from '@/lib/sns/scrape'

const BodySchema = z.object({
  candidate: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    // URL 또는 아이디만 허용
    threadsUrl: z.string().optional().default(''),
    instagramUrl: z.string().optional().default(''),
    blogUrl: z.string().optional().default(''),
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
    
    // Threads 처리
    if (ch === 'threads' || ch === 'all') {
      if (body.candidate.threadsUrl) {
        try {
          // URL 정규화 (아이디만 입력한 경우 처리)
          const normalizedUrl = normalizeUrl(body.candidate.threadsUrl, 'threads')
          console.log(`[measure] Threads URL 정규화: "${body.candidate.threadsUrl}" → "${normalizedUrl}"`)
          const m = await parseMetrics(normalizedUrl)
          threads = m.followers || 0
        } catch (e) {
          console.error('threads parse error:', e)
        }
      }
    }
    
    // Blog 처리
    if (ch === 'blog' || ch === 'all') {
      if (body.candidate.blogUrl) {
        try {
          // URL 정규화 (아이디만 입력한 경우 처리)
          const normalizedUrl = normalizeUrl(body.candidate.blogUrl, 'blog')
          console.log(`[measure] Blog URL 정규화: "${body.candidate.blogUrl}" → "${normalizedUrl}"`)
          const m = await parseMetrics(normalizedUrl)
          blog = m.neighbors || 0
        } catch (e) {
          console.error('blog parse error:', e)
        }
      }
    }
    
    // Instagram 처리
    if (ch === 'instagram' || ch === 'all') {
      if (body.candidate.instagramUrl) {
        try {
          // URL 정규화 (아이디만 입력한 경우 처리)
          const normalizedUrl = normalizeUrl(body.candidate.instagramUrl, 'instagram')
          console.log(`[measure] Instagram URL 정규화: "${body.candidate.instagramUrl}" → "${normalizedUrl}"`)
          const m = await parseMetrics(normalizedUrl)
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


