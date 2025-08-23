import { NextResponse } from 'next/server'
import { parseMetrics, normalizeUrl } from '@/lib/sns/scrape'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL이 필요합니다' }, { status: 400 })
    }
    
    // Threads URL에서 username 추출
    const match = url.match(/@([a-zA-Z0-9._]+)/)
    if (!match) {
      return NextResponse.json({ error: '유효한 Threads URL이 아닙니다' }, { status: 400 })
    }
    
    // 실제 팔로워수 체크
    try {
      const normalizedUrl = normalizeUrl(url, 'threads')
      const metrics = await parseMetrics(normalizedUrl)
      
      return NextResponse.json({
        followers: metrics.followers || 0,
        username: match[1],
        verified: false
      })
    } catch (error) {
      console.error('Threads 체크 실패:', error)
      // 에러 시 기본값 반환
      return NextResponse.json({
        followers: 0,
        username: match[1],
        verified: false
      })
    }
    
  } catch (error) {
    console.error('Threads check error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}