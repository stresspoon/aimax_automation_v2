import { NextResponse } from 'next/server'
import { parseMetrics, normalizeUrl } from '@/lib/sns/scrape'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL이 필요합니다' }, { status: 400 })
    }
    
    // Naver Blog URL 확인
    const isNaverBlog = url.includes('blog.naver.com')
    if (!isNaverBlog) {
      return NextResponse.json({ error: '네이버 블로그 URL이 아닙니다' }, { status: 400 })
    }
    
    // 실제 이웃수 체크
    try {
      const normalizedUrl = normalizeUrl(url, 'blog')
      const metrics = await parseMetrics(normalizedUrl)
      
      return NextResponse.json({
        neighbors: metrics.neighbors || 0,
        totalPosts: 0,
        blogTitle: ''
      })
    } catch (error) {
      console.error('Blog 체크 실패:', error)
      // 에러 시 기본값 반환
      return NextResponse.json({
        neighbors: 0,
        totalPosts: 0,
        blogTitle: ''
      })
    }
    
  } catch (error) {
    console.error('Blog check error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}