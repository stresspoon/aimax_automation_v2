import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 사용자 권한 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    // 환경 변수에서 현재 모델 가져오기
    const currentModel = process.env.OPENAI_MODEL || 'gpt-5-mini'
    const apiKeySet = !!process.env.OPENAI_API_KEY

    return NextResponse.json({
      model: currentModel,
      apiKeySet: apiKeySet
    })
  } catch (error) {
    console.error('설정 조회 오류:', error)
    return NextResponse.json({ error: '설정 조회에 실패했습니다' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    
    // 사용자 권한 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { model } = await req.json()

    // 여기서는 환경 변수를 직접 수정할 수 없으므로
    // 설정을 데이터베이스에 저장하고 실제 API 호출 시 이 값을 참조
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'openai_model',
        value: model,
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    return NextResponse.json({ success: true, model })
  } catch (error) {
    console.error('설정 저장 오류:', error)
    return NextResponse.json({ error: '설정 저장에 실패했습니다' }, { status: 500 })
  }
}