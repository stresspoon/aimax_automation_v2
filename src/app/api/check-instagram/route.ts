import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL이 필요합니다' }, { status: 400 })
    }
    
    // Instagram URL에서 username 추출
    const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/)
    if (!match) {
      return NextResponse.json({ error: '유효한 Instagram URL이 아닙니다' }, { status: 400 })
    }
    
    // 실제 API가 없으므로 임시로 랜덤 값 반환
    // TODO: 실제 Instagram API 연동 필요
    const followers = Math.floor(Math.random() * 5000) + 500
    
    return NextResponse.json({
      followers,
      username: match[1],
      verified: Math.random() > 0.7,
      posts: Math.floor(Math.random() * 500) + 50
    })
    
  } catch (error) {
    console.error('Instagram check error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}