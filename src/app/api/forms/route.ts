import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 폼 목록 조회 또는 slug로 단일 폼 조회
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  
  const supabase = await createClient()
  
  if (slug) {
    // 공개 폼 조회 (slug로)
    const { data: form, error } = await supabase
      .from('forms')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    
    if (error || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }
    
    return NextResponse.json(form)
  }
  
  // 사용자의 폼 목록 조회
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const projectId = searchParams.get('projectId')
  
  // projectId 정리
  const cleanProjectId = (projectId === 'null' || projectId === 'undefined' || !projectId) ? null : projectId
  
  let query = supabase
    .from('forms')
    .select('*')
    .eq('user_id', user.id)
  
  // projectId가 있으면 해당 프로젝트의 폼만 조회
  if (cleanProjectId) {
    query = query.eq('project_id', cleanProjectId)
  }
  
  const { data: forms, error } = await query.order('created_at', { ascending: false })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(forms || [])
}

// POST: 새 폼 생성
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('POST /api/forms - No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json()
    const { projectId, title, description, defaultFields: userDefaultFields, customFields, googleSheetUrl } = body
    
    // projectId가 'null' 문자열이거나 빈 문자열이면 null로 변환
    const cleanProjectId = (projectId === 'null' || projectId === 'undefined' || !projectId) ? null : projectId
    
    console.log('POST /api/forms - Creating form:', { 
      projectId: cleanProjectId, 
      title, 
      description, 
      googleSheetUrl, 
      userId: user.id 
    })
    
    // 기본 필드 설정 - 사용자가 선택한 필드만 포함
    const defaultFieldsConfig = userDefaultFields || {
      name: { label: "성함", type: "text", required: true, order: 1 },
      phone: { label: "연락처", type: "tel", required: true, order: 2 },
      email: { label: "메일주소", type: "email", required: true, order: 3 },
      source: { label: "어디에서 신청주셨나요?", type: "text", required: false, order: 4 },
      threadsUrl: { label: "후기 작성할 스레드 URL", type: "url", required: false, order: 5 },
      instagramUrl: { label: "후기 작성할 인스타그램 URL", type: "url", required: false, order: 6 },
      blogUrl: { label: "후기 작성할 블로그 URL", type: "url", required: false, order: 7 },
      privacyConsent: { label: "개인정보 활용 동의", type: "checkbox", required: true, order: 8 }
    }
    
    const fields = {
      default: defaultFieldsConfig,
      custom: customFields || {}
    }
    
    // Google Sheets 정보 파싱
    let sheetId = null
    let sheetName = 'Form Responses'
    
    if (googleSheetUrl) {
      const match = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
      if (match) {
        sheetId = match[1]
      }
    }
    
    // 폼 생성
    const { data: form, error } = await supabase
      .from('forms')
      .insert({
        project_id: cleanProjectId,  // 정리된 projectId 사용
        user_id: user.id,
        title: title || '고객 정보 수집',
        description: description || '아래 정보를 입력해주세요',
        fields: fields,
        settings: {
          selectionCriteria: {
            threads: 500,
            blog: 300,
            instagram: 1000
          },
          theme: {
            primaryColor: '#3B82F6',
            logo: null
          }
        },
        google_sheet_id: sheetId,
        google_sheet_url: googleSheetUrl || null,
        google_sheet_name: sheetName
      })
      .select()
      .single()
    
    if (error) {
      console.error('POST /api/forms - Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (!form) {
      console.error('POST /api/forms - Form not returned after insert')
      return NextResponse.json({ error: 'Form creation failed' }, { status: 500 })
    }
    
    console.log('POST /api/forms - Form created successfully:', form.id)
    
    return NextResponse.json({
      success: true,
      form,
      formUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/form/${form.slug}`,
      message: '폼이 생성되었습니다'
    })
    
  } catch (error) {
    console.error('POST /api/forms - Unexpected error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}

// PATCH: 폼 업데이트
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json()
    const { id, title, description, defaultFields, customFields } = body
    
    console.log('PATCH /api/forms - Received update request:', { 
      id, 
      hasDefaultFields: defaultFields !== undefined,
      hasCustomFields: customFields !== undefined 
    })
    
    // 업데이트할 데이터 준비
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    
    // 필드 업데이트가 있는 경우
    if (defaultFields !== undefined || customFields !== undefined) {
      const { data: existingForm } = await supabase
        .from('forms')
        .select('fields')
        .eq('id', id)
        .single()
      
      // 필드 구조를 완전히 새로 구성
      updateData.fields = {
        default: defaultFields !== undefined ? defaultFields : (existingForm?.fields?.default || {}),
        custom: customFields !== undefined ? customFields : (existingForm?.fields?.custom || {})
      }
    }
    
    console.log('PATCH /api/forms - Update data:', JSON.stringify(updateData, null, 2))
    
    const { data: form, error } = await supabase
      .from('forms')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error) {
      console.error('PATCH /api/forms - Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('PATCH /api/forms - Update successful, form fields:', form?.fields)
    
    return NextResponse.json(form)
    
  } catch (error) {
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}