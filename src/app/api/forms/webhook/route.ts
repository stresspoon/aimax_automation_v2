import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Google Forms 응답을 받는 웹훅
export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('📋 Google Forms 웹훅 수신:', body)
    
    // Forms 응답 데이터 파싱
    const formResponse = {
      timestamp: body.timestamp || new Date().toISOString(),
      name: body.name || body['성함'] || '',
      email: body.email || body['이메일'] || '',
      phone: body.phone || body['연락처'] || '',
      threadsUrl: body.threadsUrl || body['스레드 URL'] || '',
      instagramUrl: body.instagramUrl || body['인스타그램 URL'] || '',
      blogUrl: body.blogUrl || body['블로그 URL'] || ''
    }
    
    // 프로젝트 ID 찾기 (Forms ID 또는 다른 식별자로)
    const projectId = body.projectId || req.headers.get('x-project-id')
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }
    
    // 새로운 응답을 프로젝트에 추가
    const supabase = await createClient()
    const { data: project } = await supabase
      .from('projects')
      .select('data')
      .eq('id', projectId)
      .single()
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // 새 후보자 처리 (SNS 체크 포함)
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/sheets/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        candidates: [formResponse], // 단일 응답
        checkNewOnly: true,
        selectionCriteria: project.data?.step2?.selectionCriteria
      })
    })
    
    const result = await response.json()
    console.log('✅ Forms 응답 처리 완료:', result)
    
    return NextResponse.json({ 
      success: true, 
      message: '응답이 자동으로 처리되었습니다',
      result 
    })
  } catch (error) {
    console.error('Forms webhook error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}