import { NextResponse } from 'next/server'
import { checkUsageLimit } from '@/lib/usage'

export async function GET() {
  try {
    const usage = await checkUsageLimit('content_generation')
    return NextResponse.json(usage)
  } catch (error) {
    console.error('사용량 확인 오류:', error)
    return NextResponse.json(
      { error: '사용량 확인에 실패했습니다' },
      { status: 500 }
    )
  }
}