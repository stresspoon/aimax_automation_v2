import { NextResponse } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 폼 응답을 candidates 형식으로 변환하여 반환
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawProjectId = searchParams.get('projectId')
  // 'null' / 'undefined' 문자열 정리
  const projectId = rawProjectId && rawProjectId !== 'null' && rawProjectId !== 'undefined' ? rawProjectId : null
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    // 프로젝트의 폼만 찾기 (projectId 없으면 전역 폼)
    console.log('Sync candidates - Looking for forms with projectId:', projectId, 'userId:', user.id)
    let formsQuery = supabase.from('forms').select('id').eq('user_id', user.id)
    if (projectId) {
      formsQuery = formsQuery.eq('project_id', projectId)
    } else {
      formsQuery = formsQuery.is('project_id', null)
    }
    const { data: forms, error: formsError } = await formsQuery
    if (formsError) {
      console.error('Forms query error:', formsError)
      return NextResponse.json({ error: formsError.message }, { status: 500 })
    }
    if (!forms || forms.length === 0) {
      return NextResponse.json({ candidates: [], totalResponses: 0, formIds: [], message: '해당 프로젝트의 폼이 없습니다' })
    }
    
    // 프로젝트의 모든 폼 응답 가져오기 (public.form_responses 뷰 기준)
    const formIds = forms.map(f => f.id)
    console.log('Fetching responses for forms:', formIds)
    let responses: any[] | null = null
    let error: any = null
    try {
      const { data, error: viewError } = await supabase
        .from('form_responses')
        .select('*')
        .in('form_id', formIds)
        .order('created_at', { ascending: false })
      responses = data
      error = viewError
    } catch (e) {
      error = e
    }
    console.log(`Found ${responses?.length || 0} responses for project ${projectId}`)
    
    if (error) {
      console.error('Error fetching responses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // candidates 형식으로 변환
    const candidates = (responses || []).map(response => {
      // data 필드에서 모든 폼 입력값 가져오기
      const formData = response.data || {}
      
      return {
        // 기본 필드들
        name: response.name || formData.name || formData.이름 || '',
        email: response.email || formData.email || formData.이메일 || '',
        phone: response.phone || formData.phone || formData.연락처 || formData.전화번호 || '',
        
        // SNS 체크 결과
        threads: response.sns_check_result?.threads?.followers || 0,
        blog: response.sns_check_result?.blog?.neighbors || 0,
        instagram: response.sns_check_result?.instagram?.followers || 0,
        
        // 상태
        status: response.is_selected ? 'selected' : 'notSelected',
        
        // URL 필드들
        threadsUrl: formData.threadsUrl || formData.스레드 || formData.threads || '',
        instagramUrl: formData.instagramUrl || formData.인스타그램 || formData.instagram || '',
        blogUrl: formData.blogUrl || formData.블로그 || formData.blog || '',
        
        // 추가 필드들
        source: formData.source || formData.신청경로 || '',
        
        // 체크 상태
        checkStatus: {
          threads: response.sns_check_result?.threads?.checked ? 'completed' : 'pending',
          blog: response.sns_check_result?.blog?.checked ? 'completed' : 'pending',
          instagram: response.sns_check_result?.instagram?.checked ? 'completed' : 'pending'
        },
        
        // 모든 폼 데이터를 포함 (엑셀 다운로드용)
        ...formData
      }))
    
    return NextResponse.json({ 
      candidates,
      totalResponses: responses?.length || 0,
      formIds
    })
    
  } catch (error) {
    console.error('Sync candidates error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}