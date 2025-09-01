import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseMetrics, normalizeUrl } from '@/lib/sns/scrape'

// SNS 체크 로직 (백그라운드 처리와 동일)
async function processSingleResponse(responseId: string) {
  const adminSupabase = createAdminClient()
  
  try {
    // 응답 데이터 가져오기
    const { data: response } = await adminSupabase
      .from('form_responses_temp')
      .select('*')
      .eq('id', responseId)
      .single()
    
    if (!response) {
      return { error: 'Response not found' }
    }
    
    // 이미 처리됨
    if (response.status === 'completed') {
      return { success: true, message: 'Already processed' }
    }
    
    // 폼 정보 가져오기
    const { data: form } = await adminSupabase
      .from('forms')
      .select('*')
      .eq('id', response.form_id)
      .single()
    
    if (!form) {
      return { error: 'Form not found' }
    }
    
    // SNS 체크
    const snsResult: any = {
      threads: { followers: 0, checked: false },
      instagram: { followers: 0, checked: false },
      blog: { neighbors: 0, checked: false },
      custom: {}
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
    
    // 모든 필드 체크
    for (const [fieldName, fieldValue] of Object.entries(response.data || {})) {
      if (typeof fieldValue === 'string' && fieldValue.includes('://')) {
        const snsType = detectSNSType(fieldValue)
        
        if (fieldName === 'threadsUrl' || snsType === 'threads') {
          try {
            const url = normalizeUrl(fieldValue, 'threads')
            const metrics = await parseMetrics(url)
            snsResult.threads = {
              url: fieldValue,
              followers: metrics.followers || 0,
              checked: true
            }
          } catch (err) {
            console.error(`Threads check error:`, err)
            snsResult.threads = {
              url: fieldValue,
              followers: 0,
              checked: true,
              error: (err as Error).message
            }
          }
        } else if (fieldName === 'instagramUrl' || snsType === 'instagram') {
          try {
            const url = normalizeUrl(fieldValue, 'instagram')
            const metrics = await parseMetrics(url)
            snsResult.instagram = {
              url: fieldValue,
              followers: metrics.followers || 0,
              checked: true
            }
          } catch (err) {
            console.error(`Instagram check error:`, err)
            snsResult.instagram = {
              url: fieldValue,
              followers: 0,
              checked: true,
              error: (err as Error).message
            }
          }
        } else if (fieldName === 'blogUrl' || snsType === 'blog') {
          try {
            const url = normalizeUrl(fieldValue, 'blog')
            const metrics = await parseMetrics(url)
            snsResult.blog = {
              url: fieldValue,
              neighbors: metrics.neighbors || 0,
              checked: true
            }
          } catch (err) {
            console.error(`Blog check error:`, err)
            snsResult.blog = {
              url: fieldValue,
              neighbors: 0,
              checked: true,
              error: (err as Error).message
            }
          }
        }
      }
    }
    
    // 선정 기준 확인
    const criteria = form.settings?.selectionCriteria || {
      threads: 500,
      blog: 300,
      instagram: 1000
    }
    
    const isSelected = 
      (snsResult.threads.checked && snsResult.threads.followers >= criteria.threads) ||
      (snsResult.instagram.checked && snsResult.instagram.followers >= criteria.instagram) ||
      (snsResult.blog.checked && snsResult.blog.neighbors >= criteria.blog)
    
    // 결과 업데이트
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
    
    // 큐에서 제거
    await adminSupabase
      .from('processing_queue')
      .delete()
      .eq('response_id', responseId)
    
    return {
      success: true,
      snsResult,
      isSelected
    }
  } catch (error) {
    console.error('Processing error:', error)
    return { error: (error as Error).message }
  }
}

// POST: 수동으로 특정 응답 또는 전체 큐 처리
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { responseId, processAll } = await req.json()
  
  try {
    const adminSupabase = createAdminClient()
    
    if (responseId) {
      // 특정 응답만 처리
      const result = await processSingleResponse(responseId)
      return NextResponse.json(result)
    } else if (processAll) {
      // 대기 중인 모든 응답 처리
      const { data: pendingResponses } = await adminSupabase
        .from('form_responses_temp')
        .select('id')
        .eq('status', 'pending')
        .limit(10) // 한 번에 최대 10개
      
      if (!pendingResponses || pendingResponses.length === 0) {
        return NextResponse.json({ 
          success: true, 
          message: '처리할 응답이 없습니다' 
        })
      }
      
      const results = await Promise.all(
        pendingResponses.map(r => processSingleResponse(r.id))
      )
      
      const successCount = results.filter(r => r.success).length
      const errorCount = results.filter(r => r.error).length
      
      return NextResponse.json({
        success: true,
        processed: successCount,
        errors: errorCount,
        total: pendingResponses.length
      })
    } else {
      return NextResponse.json({ 
        error: 'responseId 또는 processAll 필요' 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Manual process error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}

// GET: 대기 중인 응답 상태 확인
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const adminSupabase = createAdminClient()
    
    // 상태별 카운트
    const { data: pending } = await adminSupabase
      .from('form_responses_temp')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    
    const { data: processing } = await adminSupabase
      .from('form_responses_temp')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'processing')
    
    const { data: completed } = await adminSupabase
      .from('form_responses_temp')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
    
    const { data: queuedItems } = await adminSupabase
      .from('processing_queue')
      .select('id', { count: 'exact', head: true })
    
    return NextResponse.json({
      pending: pending?.length || 0,
      processing: processing?.length || 0,
      completed: completed?.length || 0,
      queued: queuedItems?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}