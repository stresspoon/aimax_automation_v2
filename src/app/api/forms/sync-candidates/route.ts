import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 폼 응답을 candidates 형식으로 변환하여 반환
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    // 프로젝트의 폼 찾기
    console.log('Sync candidates - Looking for forms with projectId:', projectId, 'userId:', user.id)
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
    
    console.log('Forms found:', forms, 'Error:', formsError)
    
    if (!forms || forms.length === 0) {
      return NextResponse.json({ candidates: [], message: '폼이 없습니다' })
    }
    
    // 폼의 모든 응답 가져오기
    console.log('Fetching responses for form:', forms[0].id)
    const { data: responses, error } = await supabase
      .from('form_responses_temp')
      .select('*')
      .eq('form_id', forms[0].id)
      .in('status', ['completed', 'processing', 'pending'])
      .order('created_at', { ascending: false })
    
    console.log('Responses found:', responses?.length, 'Error:', error)
    
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
      formId: forms[0].id
    })
    
  } catch (error) {
    console.error('Sync candidates error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}