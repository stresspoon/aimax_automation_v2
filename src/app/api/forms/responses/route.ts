import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
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
            // 에러가 발생해도 체크 시도했음을 기록
            if (fieldName === 'threadsUrl') {
              snsResult.threads = {
                url: fieldValue,
                followers: 0,
                checked: true,
                error: (err as Error).message
              }
            }
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
            // 에러가 발생해도 체크 시도했음을 기록
            if (fieldName === 'instagramUrl') {
              snsResult.instagram = {
                url: fieldValue,
                followers: 0,
                checked: true,
                error: (err as Error).message
              }
            }
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
    const data = await req.json()
    const { formId, ...responseData } = data
    
    // 폼 응답 제출은 공개 API이므로 일반 클라이언트 사용
    const supabase = await createClient()
    
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
    
    // service role 클라이언트 시도 (없어도 동작하도록 폴백)
    let adminSupabase: any | null = null
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      adminSupabase = createAdminClient()
    } catch (e) {
      console.warn('Service role client unavailable. Falling back to anon client for insert.', e)
    }
    
    // 중복 체크 (이메일 기준) - service role 사용 가능할 때만 수행
    if (adminSupabase) {
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
    }
    
    // 응답 저장 - admin client 사용으로 RLS 우회
    // 마이그레이션 미적용 환경 호환을 위해 최소 컬럼만 삽입
    const insertPayload: Record<string, any> = {
      form_id: formId,
      email: responseData.email,
      name: responseData.name || responseData.이름 || '',  // name 필드 추가
      data: responseData,
      status: 'pending'
    }

    let responseId: string | null = null
    if (adminSupabase) {
      const { data: response, error: responseError } = await adminSupabase
        .from('form_responses_temp')
        .insert(insertPayload)
        .select('id')
        .single()
      
      if (responseError) {
        console.error('Failed to insert response:', responseError)
        return NextResponse.json({ 
          error: `응답 저장 실패: ${responseError.message}`,
          details: responseError
        }, { status: 500 })
      }
      responseId = response.id
    } else {
      // anon 클라이언트로는 RLS 때문에 select로 id를 가져올 수 없으므로 서버에서 미리 생성
      const newId = randomUUID()
      const { error: insertError } = await supabase
        .from('form_responses_temp')
        .insert({ id: newId, ...insertPayload })
      
      if (insertError) {
        console.error('Failed to insert response (anon):', insertError)
        return NextResponse.json({ 
          error: `응답 저장 실패: ${insertError.message}`,
          details: insertError
        }, { status: 500 })
      }
      responseId = newId
    }
    
    // 처리 큐에 추가 - admin client 사용
    if (adminSupabase && responseId) {
      const { error: queueError } = await adminSupabase
        .from('processing_queue')
        .insert({
          response_id: responseId,
          priority: 1
        })
    
      if (queueError) {
        console.error('Failed to add to queue:', queueError)
        // 큐 추가 실패는 치명적이지 않으므로 계속 진행
      }
    }
    
    // SNS 체크를 즉시 실행 (서버리스 환경 고려)
    console.log('🚀 Starting immediate SNS check for response:', responseId)
    
    // Vercel 서버리스 환경에서는 응답 후 프로세스가 종료되므로
    // waitUntil을 사용하거나 동기적으로 처리해야 함
    // 1. 즉시 처리 시도 (짧은 타임아웃)
    const processPromise = processResponseInBackground(responseId!)
    
    // 2. 최대 5초만 기다림 (사용자 경험 vs 처리 완료의 균형)
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 5000))
    
    // 둘 중 하나가 먼저 완료되면 진행
    await Promise.race([processPromise, timeoutPromise]).catch(err => {
      console.error('Background processing error:', err)
      // 에러가 발생해도 응답은 반환 (큐에서 나중에 재처리)
    })
    
    return NextResponse.json({
      success: true,
      message: '신청이 완료되었습니다',
      responseId
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
  
  try {
    // 1) 사용자 소유의 폼 ID 목록 로드 (프로젝트 스코프 반영)
    let formsQuery = supabase.from('forms').select('id').eq('user_id', user.id)
    if (cleanProjectId) {
      formsQuery = formsQuery.eq('project_id', cleanProjectId)
    } else {
      formsQuery = formsQuery.is('project_id', null)
    }
    const { data: forms, error: formsError } = await formsQuery
    if (formsError) {
      return NextResponse.json({ error: formsError.message }, { status: 500 })
    }
    const formIds = (forms || []).map(f => f.id)
    if (formIds.length === 0) {
      return NextResponse.json([])
    }

    // 2) public.form_responses 뷰를 기준으로 조회
    let viewQuery = supabase
      .from('form_responses')
      .select('*')
      .in('form_id', formIds)
      .order('created_at', { ascending: false })
    
    if (formId) {
      viewQuery = viewQuery.eq('form_id', formId)
    }
    if (status) {
      viewQuery = viewQuery.eq('status', status)
    }

    const { data: responses, error: viewError } = await viewQuery
    if (viewError) {
      return NextResponse.json({ error: viewError.message }, { status: 500 })
    }
    return NextResponse.json(responses || [])
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch responses' }, { status: 500 })
  }
}