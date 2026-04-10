import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: 폼 응답의 실시간 상태 확인
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const responseId = searchParams.get('responseId')
    const formId = searchParams.get('formId')
    
    // Service role 클라이언트 사용 (RLS 우회)
    const adminSupabase = createAdminClient()
    
    if (responseId) {
      // 특정 응답의 상태 확인 (필요 컬럼만)
      const { data: response, error } = await adminSupabase
        .from('form_responses_temp')
        .select('id, status, is_selected, selection_reason, sns_check_result, processed_at, error_message')
        .eq('id', responseId)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }

      return NextResponse.json(response)
    } else if (formId) {
      // 폼의 응답 상태 확인 (페이지네이션 + 통계를 병렬 조회)
      const page = Math.max(1, parseInt(new URL(req.url).searchParams.get('page') || '1', 10))
      const pageSize = Math.min(500, Math.max(1, parseInt(new URL(req.url).searchParams.get('pageSize') || '100', 10)))
      const offset = (page - 1) * pageSize

      // 응답 목록과 상태별 카운트를 병렬 조회
      const [responsesResult, totalResult, pendingResult, processingResult, completedResult, errorResult, selectedResult, rejectedResult] = await Promise.all([
        adminSupabase
          .from('form_responses_temp')
          .select('id, status, is_selected, selection_reason, sns_check_result, processed_at, email, name', { count: 'exact' })
          .eq('form_id', formId)
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1),
        adminSupabase.from('form_responses_temp').select('id', { count: 'exact', head: true }).eq('form_id', formId),
        adminSupabase.from('form_responses_temp').select('id', { count: 'exact', head: true }).eq('form_id', formId).eq('status', 'pending'),
        adminSupabase.from('form_responses_temp').select('id', { count: 'exact', head: true }).eq('form_id', formId).eq('status', 'processing'),
        adminSupabase.from('form_responses_temp').select('id', { count: 'exact', head: true }).eq('form_id', formId).eq('status', 'completed'),
        adminSupabase.from('form_responses_temp').select('id', { count: 'exact', head: true }).eq('form_id', formId).eq('status', 'error'),
        adminSupabase.from('form_responses_temp').select('id', { count: 'exact', head: true }).eq('form_id', formId).eq('is_selected', true),
        adminSupabase.from('form_responses_temp').select('id', { count: 'exact', head: true }).eq('form_id', formId).eq('is_selected', false),
      ])

      if (responsesResult.error) {
        return NextResponse.json({ error: responsesResult.error.message }, { status: 500 })
      }

      const stats = {
        total: totalResult.count || 0,
        pending: pendingResult.count || 0,
        processing: processingResult.count || 0,
        completed: completedResult.count || 0,
        error: errorResult.count || 0,
        selected: selectedResult.count || 0,
        rejected: rejectedResult.count || 0
      }

      return NextResponse.json({
        data: responsesResult.data,
        total: responsesResult.count || 0,
        page,
        pageSize,
        stats
      })
    } else {
      return NextResponse.json({ error: 'responseId 또는 formId가 필요합니다' }, { status: 400 })
    }
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}