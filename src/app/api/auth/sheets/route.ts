import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    
    // Google OAuth2 클라이언트 생성
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXT_PUBLIC_BASE_URL + '/auth/sheets-callback'
    )
    
    // 권한 URL 생성
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
      prompt: 'consent',
      state: user.id // 사용자 ID를 state로 전달
    })

    return NextResponse.json({ url: authUrl })
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
    
    const { code } = await req.json()
    
    if (!code) {
      return NextResponse.json({ error: 'Authorization code가 필요합니다' }, { status: 400 })
    }
    
    // OAuth2 클라이언트 생성
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXT_PUBLIC_BASE_URL + '/auth/sheets-callback'
    )
    
    // 코드를 토큰으로 교환
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.json({ error: '토큰 교환 실패' }, { status: 500 })
    }
    
    // 먼저 테이블 존재 확인을 위해 조회 시도
    const { data: existingConnection } = await supabase
      .from('sheets_connections')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    // 기존 연결이 있으면 업데이트, 없으면 삽입
    const connectionData = {
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000
    }
    
    let error
    if (existingConnection) {
      // 업데이트
      const { error: updateError } = await supabase
        .from('sheets_connections')
        .update(connectionData)
        .eq('user_id', user.id)
      error = updateError
    } else {
      // 삽입
      const { error: insertError } = await supabase
        .from('sheets_connections')
        .insert(connectionData)
      error = insertError
    }
    
    if (error) {
      console.error('Sheets connection save error:', error)
      return NextResponse.json({ error: '연결 정보 저장 실패' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
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