import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    
    // BASE_URL 확인 및 기본값 설정
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://aimax.vercel.app')
    
    // Google Sheets OAuth용 Google 로그인
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/sheets-callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
      },
    })

    if (error) {
      console.error('Sheets OAuth error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data || !data.url) {
      return NextResponse.json({ error: 'OAuth URL이 반환되지 않았습니다' }, { status: 500 })
    }

    return NextResponse.json({ url: data.url })
  } catch (error) {
    console.error('Sheets OAuth URL error:', error)
    return NextResponse.json({ error: 'Google Sheets OAuth URL 생성 중 오류가 발생했습니다' }, { status: 500 })
  }
}

// Google Sheets 연결 정보 저장
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    
    const { accessToken, refreshToken, email } = await req.json()
    
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token이 필요합니다' }, { status: 400 })
    }
    
    // Sheets 연결 정보 저장 (먼저 기존 연결 삭제)
    const { error: deleteError } = await supabase
      .from('sheets_connections')
      .delete()
      .eq('user_id', user.id)
    
    if (deleteError) {
      console.error('기존 연결 삭제 오류:', deleteError)
    }
    
    // 새로운 연결 정보 저장
    const { error } = await supabase
      .from('sheets_connections')
      .insert({
        user_id: user.id,
        email: email || user.email,
        access_token: accessToken,
        refresh_token: refreshToken,
        connected_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Sheets connection save error:', error)
      return NextResponse.json({ error: '연결 정보 저장 실패' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, email })
  } catch (error) {
    console.error('Sheets connection error:', error)
    return NextResponse.json({ error: 'Google Sheets 연결 중 오류가 발생했습니다' }, { status: 500 })
  }
}

// Google Sheets 연결 해제
export async function DELETE() {
  try {
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    
    // Sheets 연결 정보 삭제
    const { error } = await supabase
      .from('sheets_connections')
      .delete()
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Sheets disconnection error:', error)
      return NextResponse.json({ error: '연결 해제 실패' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sheets disconnection error:', error)
    return NextResponse.json({ error: 'Google Sheets 연결 해제 중 오류가 발생했습니다' }, { status: 500 })
  }
}