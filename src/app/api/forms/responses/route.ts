import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: 폼 응답 제출
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const data = await req.json()
    const { formId, ...responseData } = data
    
    // 폼 확인
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .eq('is_active', true)
      .single()
    
    if (formError || !form) {
      return NextResponse.json({ error: '폼을 찾을 수 없습니다' }, { status: 404 })
    }
    
    // 중복 체크 (이메일 기준)
    const { data: existingResponse } = await supabase
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
    
    // 응답 저장
    const { data: response, error: responseError } = await supabase
      .from('form_responses_temp')
      .insert({
        form_id: formId,
        email: responseData.email,
        name: responseData.name,
        phone: responseData.phone,
        data: responseData,
        status: 'pending'
      })
      .select()
      .single()
    
    if (responseError) {
      return NextResponse.json({ error: responseError.message }, { status: 500 })
    }
    
    // 처리 큐에 추가
    await supabase
      .from('processing_queue')
      .insert({
        response_id: response.id,
        priority: 1
      })
    
    // 백그라운드 처리 트리거 (비동기) - SNS 체크 및 선정
    setTimeout(() => {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/forms/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId: response.id })
      }).catch(error => {
        console.error('Background processing error:', error)
      })
    }, 1000) // 1초 후 처리 시작
    
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
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  let query = supabase
    .from('form_responses_temp')
    .select(`
      *,
      forms!inner(user_id)
    `)
    .eq('forms.user_id', user.id)
    .order('created_at', { ascending: false })
  
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