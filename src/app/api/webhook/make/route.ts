import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Make.com에서 새 행이 추가될 때만 호출되는 웹훅
export async function POST(req: Request) {
  try {
    // Make.com에서 보낸 데이터
    const body = await req.json()
    console.log('🔔 Make.com 웹훅 수신 - 새 행 감지:', body)
    
    // 프로젝트 ID와 새 행 데이터 추출
    const projectId = body.projectId || req.headers.get('x-project-id')
    const rowNumber = body.rowNumber || body.row_number
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }
    
    // 새로운 후보자 데이터 (Make.com에서 매핑된 필드)
    const newCandidate = {
      name: body.name || body['성함'] || '',
      email: body.email || body['이메일'] || '',
      phone: body.phone || body['연락처'] || '',
      threadsUrl: body.threadsUrl || body['스레드 URL'] || '',
      instagramUrl: body.instagramUrl || body['인스타그램 URL'] || '',
      blogUrl: body.blogUrl || body['블로그 URL'] || '',
      rowNumber: rowNumber, // 행 번호 저장 (중복 방지용)
      addedAt: new Date().toISOString()
    }
    
    console.log('📋 새 후보자:', newCandidate)
    
    // DB에서 프로젝트 가져오기
    const supabase = await createClient()
    const { data: project } = await supabase
      .from('projects')
      .select('data')
      .eq('id', projectId)
      .single()
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // 기존 후보자 목록
    const existingCandidates = project.data?.step2?.candidates || []
    
    // 중복 체크 (이메일과 행 번호로)
    const isDuplicate = existingCandidates.some((c: any) => 
      c.email === newCandidate.email || c.rowNumber === rowNumber
    )
    
    if (isDuplicate) {
      console.log('⚠️ 중복된 후보자 - 건너뜀')
      return NextResponse.json({ 
        success: true, 
        message: 'Duplicate candidate, skipped',
        duplicate: true 
      })
    }
    
    // SNS 체크 (새 후보자만)
    console.log('🔍 SNS 체크 시작...')
    const selectionCriteria = project.data?.step2?.selectionCriteria || {
      threads: 500,
      blog: 300,
      instagram: 1000
    }
    
    let threads = 0, blog = 0, instagram = 0
    const checkStatus: any = {}
    
    // Threads 체크
    if (newCandidate.threadsUrl) {
      try {
        console.log('Checking Threads:', newCandidate.threadsUrl)
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/sns/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: newCandidate.threadsUrl })
        })
        const result = await response.json()
        threads = result.followers || 0
        checkStatus.threads = threads > 0 ? 'completed' : 'error'
        console.log('✅ Threads 팔로워:', threads)
      } catch (err) {
        checkStatus.threads = 'error'
        console.error('Threads 체크 실패:', err)
      }
    }
    
    // Blog 체크
    if (newCandidate.blogUrl) {
      try {
        console.log('Checking Blog:', newCandidate.blogUrl)
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/sns/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: newCandidate.blogUrl })
        })
        const result = await response.json()
        blog = result.followers || 0
        checkStatus.blog = blog > 0 ? 'completed' : 'error'
        console.log('✅ Blog 이웃:', blog)
      } catch (err) {
        checkStatus.blog = 'error'
        console.error('Blog 체크 실패:', err)
      }
    }
    
    // Instagram 체크
    if (newCandidate.instagramUrl) {
      try {
        console.log('Checking Instagram:', newCandidate.instagramUrl)
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/sns/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: newCandidate.instagramUrl })
        })
        const result = await response.json()
        instagram = result.followers || 0
        checkStatus.instagram = instagram > 0 ? 'completed' : 'error'
        console.log('✅ Instagram 팔로워:', instagram)
      } catch (err) {
        checkStatus.instagram = 'error'
        console.error('Instagram 체크 실패:', err)
      }
    }
    
    // 선정 여부 판단
    const selected = 
      threads >= selectionCriteria.threads ||
      blog >= selectionCriteria.blog ||
      instagram >= selectionCriteria.instagram
    
    // 완성된 후보자 객체
    const processedCandidate = {
      ...newCandidate,
      threads,
      blog,
      instagram,
      status: selected ? 'selected' : 'notSelected',
      checkStatus,
      processedAt: new Date().toISOString()
    }
    
    // DB에 저장 (기존 데이터에 추가)
    const updatedCandidates = [...existingCandidates, processedCandidate]
    const stats = {
      total: updatedCandidates.length,
      selected: updatedCandidates.filter((c: any) => c.status === 'selected').length,
      notSelected: updatedCandidates.filter((c: any) => c.status === 'notSelected').length
    }
    
    await supabase
      .from('projects')
      .update({
        data: {
          ...project.data,
          step2: {
            ...project.data.step2,
            candidates: updatedCandidates,
            stats,
            lastWebhookAt: new Date().toISOString(),
            lastRowNumber: rowNumber
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
    
    console.log('✅ 새 후보자 처리 완료:', {
      name: processedCandidate.name,
      status: processedCandidate.status,
      metrics: { threads, blog, instagram }
    })
    
    return NextResponse.json({
      success: true,
      message: `새 후보자 ${processedCandidate.name} 추가됨 (${selected ? '선정' : '미달'})`,
      candidate: processedCandidate,
      stats
    })
    
  } catch (error) {
    console.error('Make webhook error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}