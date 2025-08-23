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
    
    // OAuth2 클라이언트 설정
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_BASE_URL}/auth/gmail-callback`
    )
    
    // 토큰 설정
    oauth2Client.setCredentials({
      access_token: gmailConnection.access_token,
      refresh_token: gmailConnection.refresh_token,
    })
    
    // Gmail API 초기화
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    // 이메일 발송 결과
    const results = []
    const errors = []
    
    // 각 수신자에게 이메일 발송
    for (const recipient of recipients) {
      try {
        // Subject를 UTF-8로 MIME 인코딩 (RFC 2047)
        const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`
        
        // 본문에서 템플릿 변수 치환 - {{name}}과 {이름} 모두 지원
        let processedBody = body
          .replace(/\{\{name\}\}/g, recipient.name || '고객님')
          .replace(/\{이름\}/g, recipient.name || '고객님')
        
        // 이메일 메시지 생성
        const message = [
          `From: ${gmailConnection.email}`,
          `To: ${recipient.email}`,
          `Subject: ${encodedSubject}`,
          replyTo ? `Reply-To: ${replyTo}` : '',
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          '',
          processedBody
        ].filter(Boolean).join('\n')
        
        // Base64 인코딩
        const encodedMessage = Buffer.from(message, 'utf-8')
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')
        
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
            subject,
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