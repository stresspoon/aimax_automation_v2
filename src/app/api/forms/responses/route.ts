import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const FormResponseSchema = z.object({
  formId: z.string().uuid(),
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  이름: z.string().max(200).optional(),
}).passthrough() // 커스텀 필드 허용하되 기본 필드는 검증

// 백그라운드에서 SNS 체크 및 처리
async function processResponseInBackground(responseId: string, formOwnerId?: string) {
  console.log('🔄 Background processing started for:', responseId)

  // 백그라운드 처리는 service role 클라이언트 사용
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()

  try {
    // 응답 데이터 + 폼 정보 병렬 조회
    const [responseResult, formResult] = await Promise.all([
      adminSupabase
        .from('form_responses_temp')
        .select('id, form_id, data')
        .eq('id', responseId)
        .single(),
      // response.form_id를 아직 모르므로, 응답에서 form_id를 가져온 뒤 폼 조회
      Promise.resolve(null) // placeholder - 아래에서 처리
    ])

    const response = responseResult.data
    if (!response) return

    const { data: form } = await adminSupabase
      .from('forms')
      .select('id, user_id, settings')
      .eq('id', response.form_id)
      .single()

    if (!form) return

    // S11: 소유권 검증 - 폼 소유자와 호출자가 일치하는지 확인
    if (formOwnerId && form.user_id !== formOwnerId) {
      console.error(`Ownership mismatch: form owner ${form.user_id} != caller ${formOwnerId}`)
      return
    }
    
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

    // 1단계: SNS URL 필드 수집 (I/O 없음)
    const snsChecks: Array<{ fieldName: string; fieldValue: string; snsType: 'threads' | 'instagram' | 'blog' }> = []

    for (const [fieldName, fieldValue] of Object.entries(response.data || {})) {
      if (typeof fieldValue === 'string' &&
          (fieldName.toLowerCase().includes('url') ||
           fieldName.toLowerCase().includes('link') ||
           fieldValue.includes('http'))) {
        const snsType = detectSNSType(fieldValue)
        if (snsType) {
          snsChecks.push({ fieldName, fieldValue, snsType })
        }
      }
    }

    // 2단계: 모든 SNS URL을 병렬로 스크래핑 (순차 N회 → 병렬 1회)
    const scrapeResults = await Promise.allSettled(
      snsChecks.map(async ({ fieldName, fieldValue, snsType }) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/sns/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fieldValue })
        })
        const metrics = await res.json()
        return { fieldName, fieldValue, snsType, metrics }
      })
    )

    // 3단계: 결과 매핑
    for (let i = 0; i < snsChecks.length; i++) {
      const { fieldName, fieldValue, snsType } = snsChecks[i]
      const result = scrapeResults[i]

      const isDefaultField =
        (snsType === 'threads' && fieldName === 'threadsUrl') ||
        (snsType === 'instagram' && fieldName === 'instagramUrl') ||
        (snsType === 'blog' && fieldName === 'blogUrl')

      if (result.status === 'fulfilled') {
        const { metrics } = result.value
        const followerCount = metrics.followers || 0

        if (isDefaultField) {
          if (snsType === 'blog') {
            snsResult.blog = { url: fieldValue, neighbors: followerCount, checked: true }
          } else {
            snsResult[snsType] = { url: fieldValue, followers: followerCount, checked: true }
          }
        } else {
          snsResult.custom[fieldName] = {
            type: snsType,
            url: fieldValue,
            ...(snsType === 'blog' ? { neighbors: followerCount } : { followers: followerCount }),
            checked: true
          }
        }
      } else {
        console.error(`SNS check error for ${fieldName}:`, result.reason)
        if (isDefaultField) {
          if (snsType === 'blog') {
            snsResult.blog = { url: fieldValue, neighbors: 0, checked: true, error: String(result.reason) }
          } else {
            snsResult[snsType] = { url: fieldValue, followers: 0, checked: true, error: String(result.reason) }
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
    const rawData = await req.json()

    const parsed = FormResponseSchema.safeParse(rawData)
    if (!parsed.success) {
      return NextResponse.json({ error: '입력값이 올바르지 않습니다' }, { status: 400 })
    }

    const { formId, ...responseData } = parsed.data

    // 폼 조회 + admin 클라이언트 생성 병렬 실행
    const supabase = await createClient()

    // admin 클라이언트를 비동기로 준비하면서 폼 확인도 동시에 실행
    const [formResult, adminModule] = await Promise.all([
      supabase
        .from('forms')
        .select('id, user_id, title, settings, fields')
        .eq('id', formId)
        .eq('is_active', true)
        .single(),
      import('@/lib/supabase/admin').catch(() => null)
    ])

    const { data: form, error: formError } = formResult
    if (formError || !form) {
      return NextResponse.json({ error: '폼을 찾을 수 없습니다' }, { status: 404 })
    }

    // admin 클라이언트 설정
    const adminSupabase = adminModule ? adminModule.createAdminClient() : null

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
          error: '응답 저장에 실패했습니다. 잠시 후 다시 시도해주세요.'
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
          error: '응답 저장에 실패했습니다. 잠시 후 다시 시도해주세요.'
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
    const processPromise = processResponseInBackground(responseId!, form.user_id)
    
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

// GET: 폼 응답 조회 (페이지네이션 지원)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const formId = searchParams.get('formId')
  const status = searchParams.get('status')
  const projectId = searchParams.get('projectId')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get('pageSize') || '100', 10)))

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
      return NextResponse.json({ data: [], total: 0, page, pageSize })
    }

    // 2) form_responses_temp 테이블에서 페이지네이션 조회
    const offset = (page - 1) * pageSize

    let viewQuery = supabase
      .from('form_responses_temp')
      .select('id, form_id, email, name, data, status, is_selected, selection_reason, sns_check_result, created_at, processed_at', { count: 'exact' })
      .in('form_id', formIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (formId) {
      viewQuery = viewQuery.eq('form_id', formId)
    }
    if (status) {
      viewQuery = viewQuery.eq('status', status)
    }

    const { data: responses, count, error: viewError } = await viewQuery
    if (viewError) {
      return NextResponse.json({ error: viewError.message }, { status: 500 })
    }
    return NextResponse.json({
      data: responses || [],
      total: count || 0,
      page,
      pageSize
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to fetch responses'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}