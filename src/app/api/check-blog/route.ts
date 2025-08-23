import { NextResponse } from 'next/server'

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
    
    // 실제 API가 없으므로 임시로 랜덤 값 반환
    // TODO: 실제 네이버 블로그 이웃 수 체크 API 연동 필요
    const neighbors = Math.floor(Math.random() * 1000) + 100
    
    return NextResponse.json({
      neighbors,
      totalPosts: Math.floor(Math.random() * 200) + 10,
      blogTitle: '테스트 블로그'
    })
    
  } catch (error) {
    console.error('Blog check error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}