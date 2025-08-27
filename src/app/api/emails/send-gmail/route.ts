import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

// Gmail을 통한 이메일 발송
export async function POST(req: Request) {
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
      return NextResponse.json({ error: 'Gmail이 연결되지 않았습니다' }, { status: 400 })
    }
    
    const { recipients, subject, body, replyTo } = await req.json()
    
    if (!recipients || !subject || !body) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다' }, { status: 400 })
    }
    
    // 환경변수 검증
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET envs')
      return NextResponse.json({ error: '서버 환경설정(Google Client)이 누락되었습니다' }, { status: 500 })
    }
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      console.warn('NEXT_PUBLIC_BASE_URL is not set - gmail-callback may be misconfigured')
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

    // 토큰 유효성 사전 확인(자동 갱신 유도)
    try {
      await oauth2Client.getAccessToken()
    } catch (tokenErr: any) {
      const msg = tokenErr?.message || ''
      console.error('Gmail token refresh error:', msg)
      // 클라이언트 불일치/만료 등은 재연결 유도
      return NextResponse.json({ error: 'Gmail 토큰이 유효하지 않습니다. Gmail을 다시 연결해주세요.' }, { status: 401 })
    }
    
    // Gmail API 초기화
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    // 이메일 발송 결과
    const results = []
    const errors = []
    
    // 각 수신자에게 이메일 발송
    for (const recipient of recipients) {
      try {
        // 제목과 본문에서 템플릿 변수 치환 - {{name}}, {이름}, {이메일} 모두 지원
        let processedSubject = subject
          .replace(/\{\{name\}\}/g, recipient.name || '고객님')
          .replace(/\{이름\}/g, recipient.name || '고객님')
          .replace(/\{\{email\}\}/g, recipient.email || '')
          .replace(/\{이메일\}/g, recipient.email || '')
        
        let processedBody = body
          .replace(/\{\{name\}\}/g, recipient.name || '고객님')
          .replace(/\{이름\}/g, recipient.name || '고객님')
          .replace(/\{\{email\}\}/g, recipient.email || '')
          .replace(/\{이메일\}/g, recipient.email || '')
        
        // 이메일 메시지 생성
        const message = [
          `From: ${gmailConnection.email}`,
          `To: ${recipient.email}`,
          `Subject: =?UTF-8?B?${Buffer.from(processedSubject, 'utf-8').toString('base64')}?=`,
          replyTo ? `Reply-To: ${replyTo}` : '',
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8',
          '',
          processedBody
        ].filter(Boolean).join('\r\n')
        
        // Gmail API용 Base64 인코딩 (URL-safe)
        const encodedMessage = Buffer.from(message, 'utf-8')
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')
        
        // 디버깅용 로그
        console.log('Sending email to:', recipient.email)
        console.log('Subject (original):', subject)
        console.log('Subject (processed):', processedSubject)
        console.log('Name:', recipient.name || '고객님')
        
        // Gmail API로 발송
        const result = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        })
        
        results.push({
          recipient: recipient.email,
          status: 'success',
          messageId: result.data.id,
        })
      } catch (error: any) {
        console.error(`Email send error for ${recipient.email}:`, error)
        errors.push({
          recipient: recipient.email,
          status: 'failed',
          error: error.message || '발송 실패',
        })
      }
    }
    
    // 발송 기록 저장
    if (results.length > 0) {
      await supabase
        .from('email_logs')
        .insert(
          results.map(r => ({
            user_id: user.id,
            recipient: r.recipient,
            subject: subject, // 원본 제목 저장 (템플릿 포함)
            status: r.status,
            message_id: r.messageId,
            sent_at: new Date().toISOString(),
          }))
        )
    }
    
    return NextResponse.json({
      success: true,
      sent: results.length,
      failed: errors.length,
      results,
      errors,
    })
  } catch (error: any) {
    console.error('Gmail send error:', error)
    return NextResponse.json({ 
      error: error.message || '이메일 발송 중 오류가 발생했습니다' 
    }, { status: 500 })
  }
}