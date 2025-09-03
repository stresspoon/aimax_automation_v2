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
    
    // 프로젝트의 모든 폼 응답 가져오기 (form_responses_temp 테이블 직접 쿼리)
    const formIds = forms.map(f => f.id)
    console.log('Fetching responses for forms:', formIds)
    let responses: any[] | null = null
    let error: any = null
    try {
      const { data, error: viewError } = await supabase
        .from('form_responses_temp')
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
    const candidates = (responses || []).map((response, idx) => {
      // 첫 번째 응답만 디버깅
      if (idx === 0) {
        console.log('[sync-candidates] Full response structure:', JSON.stringify({
          name: response.name,
          email: response.email,
          phone: response.phone,
          data: response.data
        }, null, 2))
      }
      
      // data 필드에서 모든 폼 입력값 가져오기
      const formData = response.data || {}

      // 도우미: 다양한 라벨/키를 허용하여 값 추출
      const getByHints = (obj: Record<string, any>, hints: string[]): any => {
        const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')
        const entries = Object.entries(obj)
        
        // 디버깅: 이름 필드 찾기
        if (hints.includes('이름') || hints.includes('name')) {
          console.log('[sync-candidates] Looking for name in keys:', Object.keys(obj))
          console.log('[sync-candidates] Full form data:', JSON.stringify(obj, null, 2))
        }
        
        // 1. 정확한 매칭 먼저 시도
        for (const [k, v] of entries) {
          const nk = norm(k)
          for (const hint of hints) {
            if (nk === norm(hint)) {
              if (v !== undefined && v !== null && String(v).trim() !== '') {
                console.log(`[sync-candidates] Found by exact match: ${k} = ${v}`)
                return v
              }
            }
          }
        }
        
        // 2. 부분 매칭 시도
        for (const [k, v] of entries) {
          const nk = norm(k)
          if (hints.some(h => nk.includes(norm(h)) || norm(h).includes(nk))) {
            if (v !== undefined && v !== null && String(v).trim() !== '') {
              console.log(`[sync-candidates] Found by partial match: ${k} = ${v}`)
              return v
            }
          }
        }
        
        console.log('[sync-candidates] No match found for hints:', hints)
        return ''
      }

      // 기본 필드들
      const name = response.name 
        || getByHints(formData, ['성함','이름','성명','신청자명','닉네임','full name','name'])
      const email = response.email 
        || getByHints(formData, ['메일주소','이메일','email','e-mail'])
      const phone = response.phone 
        || getByHints(formData, ['연락처','전화번호','휴대폰','휴대전화','핸드폰','mobile','phone'])

      // URL 필드들 (헤더명/축약형 모두 지원)
      const threadsUrl = getByHints(formData, [
        '스레드url','스레드 url','스레드URL','threads url','threadsurl','threads','스레드'
      ])
      const instagramUrl = getByHints(formData, [
        '인스타그램url','인스타그램 url','인스타url','인스타 URL','instagram url','instagramurl','instagram','인스타그램','인스타'
      ])
      const blogUrl = getByHints(formData, [
        '블로그url','블로그 url','블로그URL','blog url','blogurl','blog','블로그'
      ])

      // 신청 경로/유입 경로
      const source = getByHints(formData, [
        '신청경로','신청 경로','유입경로','유입 경로','경로','출처','source','referrer','origin'
      ])
      
      return {
        // 기본 필드들
        name: name || '',
        email: email || '',
        phone: phone || '',
        
        // SNS 체크 결과
        threads: response.sns_check_result?.threads?.followers || 0,
        blog: response.sns_check_result?.blog?.neighbors || 0,
        instagram: response.sns_check_result?.instagram?.followers || 0,
        
        // 상태
        status: response.is_selected ? 'selected' : 'notSelected',
        
        // URL 필드들
        threadsUrl: threadsUrl || '',
        instagramUrl: instagramUrl || '',
        blogUrl: blogUrl || '',
        
        // 추가 필드들
        source: source || '',
        
        // 체크 상태
        checkStatus: {
          threads: response.sns_check_result?.threads?.checked ? 'completed' : 'pending',
          blog: response.sns_check_result?.blog?.checked ? 'completed' : 'pending',
          instagram: response.sns_check_result?.instagram?.checked ? 'completed' : 'pending'
        },
        
        // 모든 폼 데이터를 포함 (엑셀 다운로드용)
        ...formData
      }
    })
    
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
