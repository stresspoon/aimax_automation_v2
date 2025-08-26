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
      // 특정 응답의 상태 확인
      const { data: response, error } = await adminSupabase
        .from('form_responses_temp')
        .select('*')
        .eq('id', responseId)
        .single()
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      
      return NextResponse.json({
        id: response.id,
        status: response.status,
        is_selected: response.is_selected,
        selection_reason: response.selection_reason,
        sns_check_result: response.sns_check_result,
        processed_at: response.processed_at,
        error_message: response.error_message
      })
    } else if (formId) {
      // 폼의 모든 응답 상태 확인
      const { data: responses, error } = await adminSupabase
        .from('form_responses_temp')
        .select('id, status, is_selected, selection_reason, sns_check_result, processed_at, email, name')
        .eq('form_id', formId)
        .order('created_at', { ascending: false })
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      // 처리 상태별 카운트
      const stats = {
        total: responses.length,
        pending: responses.filter(r => r.status === 'pending').length,
        processing: responses.filter(r => r.status === 'processing').length,
        completed: responses.filter(r => r.status === 'completed').length,
        error: responses.filter(r => r.status === 'error').length,
        selected: responses.filter(r => r.is_selected === true).length,
        rejected: responses.filter(r => r.is_selected === false).length
      }
      
      return NextResponse.json({
        responses,
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