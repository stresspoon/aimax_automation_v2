import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

// Gmail 연결 테스트
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    
    // Gmail 연결 정보 가져오기
    const { data: gmailConnection, error: connectionError } = await supabase
      .from('gmail_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (connectionError || !gmailConnection) {
      return NextResponse.json({ 
        error: 'Gmail이 연결되지 않았습니다',
        details: connectionError 
      }, { status: 400 })
    }
    
    // 환경변수 확인
    const envCheck = {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_BASE_URL: !!process.env.NEXT_PUBLIC_BASE_URL
    }
    
    // OAuth2 클라이언트 설정
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/gmail-callback`
    )
    
    // 토큰 설정
    oauth2Client.setCredentials({
      refresh_token: gmailConnection.refresh_token,
      access_token: gmailConnection.access_token,
    })
    
    // 토큰 유효성 확인
    let tokenValid = false
    let tokenError = null
    try {
      const token = await oauth2Client.getAccessToken()
      tokenValid = !!token.token
    } catch (err: any) {
      tokenError = err?.message || 'Unknown error'
    }
    
    // Gmail API 테스트
    let apiTest = false
    let apiError = null
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
      const profile = await gmail.users.getProfile({ userId: 'me' })
      apiTest = !!profile.data.emailAddress
    } catch (err: any) {
      apiError = err?.message || 'Unknown error'
    }
    
    return NextResponse.json({
      status: 'checked',
      connection: {
        email: gmailConnection.email,
        hasRefreshToken: !!gmailConnection.refresh_token,
        hasAccessToken: !!gmailConnection.access_token,
        createdAt: gmailConnection.created_at
      },
      environment: envCheck,
      tokenStatus: {
        valid: tokenValid,
        error: tokenError
      },
      apiStatus: {
        valid: apiTest,
        error: apiError
      }
    })
    
  } catch (err) {
    console.error('Gmail test error:', err)
    return NextResponse.json({ 
      error: '테스트 중 오류 발생',
      details: (err as Error).message 
    }, { status: 500 })
  }
}