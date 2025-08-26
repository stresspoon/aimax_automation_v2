import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseMetrics, normalizeUrl } from '@/lib/sns/scrape'

// 백그라운드에서 SNS 체크 및 처리
async function processResponseInBackground(responseId: string) {
  console.log('🔄 Background processing started for:', responseId)
  
  // 백그라운드 처리는 service role 클라이언트 사용
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()
  
  try {
    // 응답 데이터 가져오기
    const { data: response } = await adminSupabase
      .from('form_responses_temp')
      .select('*')
      .eq('id', responseId)
      .single()
    
    if (!response) return
    
    // 폼 정보 가져오기
    const { data: form } = await adminSupabase
      .from('forms')
      .select('*')
      .eq('id', response.form_id)
      .single()
    
    if (!form) return
    
    // SNS 체크 - 기본 필드와 커스텀 필드 모두 체크
    const snsResult: any = {
      threads: { followers: 0, checked: false },
      instagram: { followers: 0, checked: false },
      blog: { neighbors: 0, checked: false },
      custom: {} // 커스텀 SNS 필드 결과
    }
    
    // URL 패턴으로 SNS 타입 감지
    const detectSNSType = (url: string): 'threads' | 'instagram' | 'blog' | null => {
      if (!url) return null
      const lowerUrl = url.toLowerCase()
      if (lowerUrl.includes('threads.net') || lowerUrl.includes('thread')) return 'threads'
      if (lowerUrl.includes('instagram.com') || lowerUrl.includes('insta')) return 'instagram'
      if (lowerUrl.includes('blog.naver.com') || lowerUrl.includes('tistory.com') || lowerUrl.includes('blog')) return 'blog'
      return null
    }
    
    // 모든 필드를 순회하면서 SNS URL 체크
    for (const [fieldName, fieldValue] of Object.entries(response.data || {})) {
      // URL 타입 필드이거나 URL 패턴을 포함하는 경우
      if (typeof fieldValue === 'string' && 
          (fieldName.toLowerCase().includes('url') || 
           fieldName.toLowerCase().includes('link') ||
           fieldValue.includes('http'))) {
        
        const snsType = detectSNSType(fieldValue)
        
        // 기본 필드 체크
        if (fieldName === 'threadsUrl' || snsType === 'threads') {
          try {
            const url = normalizeUrl(fieldValue, 'threads')
            const metrics = await parseMetrics(url)
            if (fieldName === 'threadsUrl') {
              snsResult.threads = {
                url: fieldValue,
                followers: metrics.followers || 0,
                checked: true
              }
            } else {
              // 커스텀 필드로 저장
              snsResult.custom[fieldName] = {
                type: 'threads',
                url: fieldValue,
                followers: metrics.followers || 0,
                checked: true
              }
            }
          } catch (err) {
            console.error(`Threads check error for ${fieldName}:`, err)
          }
        } else if (fieldName === 'instagramUrl' || snsType === 'instagram') {
          try {
            const url = normalizeUrl(fieldValue, 'instagram')
            const metrics = await parseMetrics(url)
            if (fieldName === 'instagramUrl') {
              snsResult.instagram = {
                url: fieldValue,
                followers: metrics.followers || 0,
                checked: true
              }
            } else {
              // 커스텀 필드로 저장
              snsResult.custom[fieldName] = {
                type: 'instagram',
                url: fieldValue,
                followers: metrics.followers || 0,
                checked: true
              }
            }
          } catch (err) {
            console.error(`Instagram check error for ${fieldName}:`, err)
          }
        } else if (fieldName === 'blogUrl' || snsType === 'blog') {
          try {
            const url = normalizeUrl(fieldValue, 'blog')
            const metrics = await parseMetrics(url)
            if (fieldName === 'blogUrl') {
              snsResult.blog = {
                url: fieldValue,
                neighbors: metrics.neighbors || 0,
                checked: true
              }
            } else {
              // 커스텀 필드로 저장
              snsResult.custom[fieldName] = {
                type: 'blog',
                url: fieldValue,
                neighbors: metrics.neighbors || 0,
                checked: true
              }
            }
          } catch (err) {
            console.error(`Blog check error for ${fieldName}:`, err)
          }
        }
      }
    }
    
    // 선정 기준 확인 - 기본 필드와 커스텀 필드 모두 확인
    const criteria = form.settings?.selectionCriteria || {
      threads: 500,
      blog: 300,
      instagram: 1000
    }
    
    // 기본 필드 체크
    let isSelected = 
      (snsResult.threads.checked && snsResult.threads.followers >= criteria.threads) ||
      (snsResult.instagram.checked && snsResult.instagram.followers >= criteria.instagram) ||
      (snsResult.blog.checked && snsResult.blog.neighbors >= criteria.blog)
    
    // 커스텀 필드도 체크
    if (!isSelected && snsResult.custom) {
      for (const customField of Object.values(snsResult.custom)) {
        const field = customField as any
        if (field.checked) {
          if (field.type === 'threads' && field.followers >= criteria.threads) {
            isSelected = true
            break
          } else if (field.type === 'instagram' && field.followers >= criteria.instagram) {
            isSelected = true
            break
          } else if (field.type === 'blog' && field.neighbors >= criteria.blog) {
            isSelected = true
            break
          }
        }
      }
    }
    
    console.log('✅ SNS Check Result:', snsResult)
    console.log('✅ Selection:', isSelected ? '선정' : '탈락')
    
    // 결과 업데이트 - admin client 사용
    await adminSupabase
      .from('form_responses_temp')
      .update({
        sns_check_result: snsResult,
        is_selected: isSelected,
        selection_reason: isSelected ? '기준 충족' : '기준 미달',
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', responseId)
    
    // 처리 큐에서 제거 - admin client 사용
    await adminSupabase
      .from('processing_queue')
      .delete()
      .eq('response_id', responseId)
    
  } catch (error) {
    console.error('Processing error:', error)
    
    // 에러 상태로 업데이트 - admin client 사용
    await adminSupabase
      .from('form_responses_temp')
      .update({
        status: 'error',
        error_message: (error as Error).message
      })
      .eq('id', responseId)
  }
}

// POST: 폼 응답 제출
export async function POST(req: Request) {
  try {
    // 폼 응답 제출은 공개 API이므로 일반 클라이언트 사용
    const supabase = await createClient()
    const data = await req.json()
    const { formId, ...responseData } = data
    
    // 폼 확인 (공개 폼 조회)
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .eq('is_active', true)
      .single()
    
    if (formError || !form) {
      console.error('Form not found:', formError)
      return NextResponse.json({ error: '폼을 찾을 수 없습니다' }, { status: 404 })
    }
    
    // 중복 체크를 위해 service role 클라이언트 사용 (RLS 우회)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()
    
    // 중복 체크 (이메일 기준)
    const { data: existingResponse } = await adminSupabase
      .from('form_responses_temp')
      .select('id')
      .eq('form_id', formId)
      .eq('email', responseData.email)
      .single()
    
    if (existingResponse) {
      return NextResponse.json({ 
        error: '이미 신청하셨습니다',
        duplicate: true 
      }, { status: 400 })
    }
    
    // 응답 저장 - admin client 사용으로 RLS 우회
    const { data: response, error: responseError } = await adminSupabase
      .from('form_responses_temp')
      .insert({
        form_id: formId,
        project_id: form.project_id, // 폼의 project_id를 응답에도 저장
        email: responseData.email,
        name: responseData.name,
        phone: responseData.phone,
        data: responseData,
        status: 'pending'
      })
      .select()
      .single()
    
    if (responseError) {
      console.error('Failed to insert response:', responseError)
      return NextResponse.json({ 
        error: `응답 저장 실패: ${responseError.message}`,
        details: responseError
      }, { status: 500 })
    }
    
    // 처리 큐에 추가 - admin client 사용
    const { error: queueError } = await adminSupabase
      .from('processing_queue')
      .insert({
        response_id: response.id,
        priority: 1
      })
    
    if (queueError) {
      console.error('Failed to add to queue:', queueError)
      // 큐 추가 실패는 치명적이지 않으므로 계속 진행
    }
    
    // SNS 체크를 즉시 실행 (백그라운드)
    console.log('🚀 Starting immediate SNS check for response:', response.id)
    
    // 비동기로 처리 (응답을 기다리지 않음)
    processResponseInBackground(response.id).catch(err => {
      console.error('Background processing failed:', err)
    })
    
    return NextResponse.json({
      success: true,
      message: '신청이 완료되었습니다',
      responseId: response.id
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}

// GET: 폼 응답 조회
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const formId = searchParams.get('formId')
  const status = searchParams.get('status')
  const projectId = searchParams.get('projectId')
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // projectId 정리
  const cleanProjectId = (projectId === 'null' || projectId === 'undefined' || !projectId) ? null : projectId
  
  let query = supabase
    .from('form_responses_temp')
    .select(`
      *,
      forms!inner(user_id, project_id)
    `)
    .eq('forms.user_id', user.id)
    .order('created_at', { ascending: false })
  
  // projectId로 필터링
  if (cleanProjectId) {
    query = query.eq('project_id', cleanProjectId)
  } else {
    // projectId가 null인 경우 - project_id가 null인 응답만 반환 (전역 응답)
    query = query.is('project_id', null)
  }
  
  if (formId) {
    query = query.eq('form_id', formId)
  }
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data: responses, error } = await query
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(responses || [])
}