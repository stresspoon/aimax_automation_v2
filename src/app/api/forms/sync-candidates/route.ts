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
    
    // 프로젝트의 모든 폼 응답 가져오기 (프로젝트 스코프 강제)
    const formIds = forms.map(f => f.id)
    console.log('Fetching responses for forms:', formIds)
    let responses: any[] | null = null
    let error: any = null
    try {
      let base = supabase.from('form_responses_temp').select('*').in('form_id', formIds)
      if (projectId) {
        base = base.eq('project_id', projectId)
      }
      const q = await base.order('created_at', { ascending: false })
      responses = q.data
      error = q.error
      if (error && /project_id/.test(error.message || '')) {
        // 컬럼 미존재 등 호환 이슈 시 project_id 필터 없이 재조회 (폼 범위로 충분히 격리됨)
        const q2 = await supabase
          .from('form_responses_temp')
          .select('*')
          .in('form_id', formIds)
          .order('created_at', { ascending: false })
        responses = q2.data
        error = q2.error
      }
    } catch (e) {
      error = e
    }
    console.log(`Found ${responses?.length || 0} responses for project ${projectId}`)
    
    if (error) {
      console.error('Error fetching responses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // candidates 형식으로 변환
    const candidates = (responses || []).map(response => ({
      name: response.name || response.data?.name || '',
      email: response.email || '',
      phone: response.phone || response.data?.phone || '',
      threads: response.sns_check_result?.threads?.followers || 0,
      blog: response.sns_check_result?.blog?.neighbors || 0,
      instagram: response.sns_check_result?.instagram?.followers || 0,
      status: response.is_selected ? 'selected' : 'notSelected',
      threadsUrl: response.data?.threadsUrl || '',
      instagramUrl: response.data?.instagramUrl || '',
      blogUrl: response.data?.blogUrl || '',
      source: response.data?.source || '',
      checkStatus: {
        threads: response.sns_check_result?.threads?.checked ? 'completed' : 'pending',
        blog: response.sns_check_result?.blog?.checked ? 'completed' : 'pending',
        instagram: response.sns_check_result?.instagram?.checked ? 'completed' : 'pending'
      }
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