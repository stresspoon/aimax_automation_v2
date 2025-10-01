import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isSheetsIntegrationEnabled } from '@/lib/flags'
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
    if (!isSheetsIntegrationEnabled()) {
      return NextResponse.json({ error: 'Sheets integration disabled' }, { status: 410 })
    }
    const json = await req.json()
    const body = BodySchema.parse(json)
    console.log('[measure API] 요청 받음:', {
      channel: body.channel,
      candidate: body.candidate.name || body.candidate.email,
      threadsUrl: body.candidate.threadsUrl,
      blogUrl: body.candidate.blogUrl,
      instagramUrl: body.candidate.instagramUrl
    })
    
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
          console.log(`[measure] Threads parseMetrics 결과:`, m)
          threads = m.followers || 0
          console.log(`[measure] Threads 최종 팔로워 수: ${threads}`)
          
          // 디버그 정보 추가
          if (threads === 0 && m.raw?.error) {
            console.error(`[measure] Threads 스크래핑 실패: ${m.raw.error}`)
          }
        } catch (e) {
          console.error('[measure] Threads 처리 오류:', e)
          console.error('[measure] 오류 상세:', (e as Error).message, (e as Error).stack)
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
          console.log(`[measure] Blog parseMetrics 결과:`, m)
          blog = m.neighbors || 0
          console.log(`[measure] Blog 최종 이웃 수: ${blog}`)
          
          // 디버그 정보 추가
          if (blog === 0 && m.raw?.error) {
            console.error(`[measure] Blog 스크래핑 실패: ${m.raw.error}`)
          }
        } catch (e) {
          console.error('[measure] Blog 처리 오류:', e)
          console.error('[measure] 오류 상세:', (e as Error).message, (e as Error).stack)
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
          console.log(`[measure] Instagram parseMetrics 결과:`, m)
          instagram = m.followers || 0
          console.log(`[measure] Instagram 최종 팔로워 수: ${instagram}`)
          
          // 디버그 정보 추가
          if (instagram === 0 && m.raw?.error) {
            console.error(`[measure] Instagram 스크래핑 실패: ${m.raw.error}`)
          }
        } catch (e) {
          console.error('[measure] Instagram 처리 오류:', e)
          console.error('[measure] 오류 상세:', (e as Error).message, (e as Error).stack)
        }
      }
    }
    const c = body.criteria || { threads: 500, blog: 300, instagram: 1000 }
    const selected = threads >= c.threads || blog >= c.blog || instagram >= c.instagram
    
    const response = { threads, blog, instagram, selected }
    console.log('[measure API] 응답:', response)
    
    return NextResponse.json(response)
  } catch (err) {
    console.error('[measure API] 오류:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}

