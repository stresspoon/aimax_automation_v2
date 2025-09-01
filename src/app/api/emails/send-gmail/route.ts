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
    
    const requestBody = await req.json()
    console.log('[Gmail API] Request body:', JSON.stringify(requestBody, null, 2))
    
    const { recipients, subject, body, replyTo } = requestBody
    
    if (!recipients || !subject || !body) {
      console.error('[Gmail API] Missing required fields:', { 
        hasRecipients: !!recipients, 
        hasSubject: !!subject, 
        hasBody: !!body,
        recipientsLength: Array.isArray(recipients) ? recipients.length : 'not array'
      })
      return NextResponse.json({ error: '필수 정보가 누락되었습니다' }, { status: 400 })
    }
    
    if (!Array.isArray(recipients) || recipients.length === 0) {
      console.error('[Gmail API] Invalid recipients:', recipients)
      return NextResponse.json({ error: '수신자 정보가 올바르지 않습니다' }, { status: 400 })
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
      const recipientEmail = recipient?.email || recipient
      
      // 이메일 주소 검증
      if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
        console.error('[Gmail API] Invalid email address:', recipientEmail)
        errors.push({
          recipient: String(recipientEmail),
          status: 'failed',
          error: '유효하지 않은 이메일 주소',
        })
        continue
      }
      
      try {
        // 디버깅 로그
        console.log('Processing recipient:', recipient)
        
        // 수신자 정보 확인 - recipient이 객체인 경우와 문자열인 경우 모두 처리
        const recipientName = (typeof recipient === 'object') 
          ? (recipient.name || recipient.username || '고객님')
          : '고객님'
        
        // 제목과 본문에서 템플릿 변수 치환 - {{name}}, {이름}, {이메일} 모두 지원
        let processedSubject = subject
          .replace(/\{\{name\}\}/g, recipientName)
          .replace(/\{이름\}/g, recipientName)
          .replace(/\{name\}/g, recipientName)  // {name} 형식도 추가
          .replace(/\{\{email\}\}/g, recipientEmail || '')
          .replace(/\{이메일\}/g, recipientEmail || '')
          .replace(/\{email\}/g, recipientEmail || '')  // {email} 형식도 추가
        
        let processedBody = body
          .replace(/\{\{name\}\}/g, recipientName)
          .replace(/\{이름\}/g, recipientName)
          .replace(/\{name\}/g, recipientName)  // {name} 형식도 추가
          .replace(/\{\{email\}\}/g, recipientEmail || '')
          .replace(/\{이메일\}/g, recipientEmail || '')
          .replace(/\{email\}/g, recipientEmail || '')  // {email} 형식도 추가
          // 줄바꿈을 HTML <br> 태그로 변환
          .replace(/\n/g, '<br/>')
        
        console.log('Processed subject:', processedSubject)
        console.log('Processed body (first 100 chars):', processedBody.substring(0, 100))
        
        // 이메일 메시지 생성 (UTF-8 인코딩 개선)
        const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Plain text 버전 생성 (HTML 태그 제거)
        const plainTextBody = processedBody.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
        const plainTextBase64 = Buffer.from(plainTextBody, 'utf-8').toString('base64')
        
        // HTML 본문을 base64로 인코딩
        const htmlBody = Buffer.from(processedBody, 'utf-8').toString('base64')
        
        // 헤더와 바디 구분을 위한 필수 빈 줄(\r\n\r\n)을 보존하기 위해
        // 의도적 빈 문자열은 제거하지 않는다. Reply-To는 있을 때만 포함한다.
        const message = [
          `From: ${gmailConnection.email}`,
          `To: ${recipientEmail}`,
          `Subject: =?UTF-8?B?${Buffer.from(processedSubject, 'utf-8').toString('base64')}?=`,
          ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
          'MIME-Version: 1.0',
          `Date: ${new Date().toUTCString()}`,
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/plain; charset=UTF-8',
          'Content-Transfer-Encoding: base64',
          '',
          plainTextBase64,
          '',
          `--${boundary}`,
          'Content-Type: text/html; charset=UTF-8',
          'Content-Transfer-Encoding: base64',
          '',
          htmlBody,
          '',
          `--${boundary}--`
        ].join('\r\n')
        
        // Gmail API용 Base64 인코딩 (URL-safe)
        const encodedMessage = Buffer.from(message, 'utf-8')
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')
        
        // 디버깅용 로그
        console.log('[Gmail] Sending email to:', recipientEmail)
        console.log('[Gmail] Subject (original):', subject)
        console.log('[Gmail] Subject (processed):', processedSubject)
        console.log('[Gmail] Name:', recipientName)
        console.log('[Gmail] Message structure created with boundary:', boundary)
        
        // Gmail API로 발송
        const result = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        })

        // 보낸편지함 라벨 확인은 참고용 경고 로그로만 남김 (일부 계정에서 지연될 수 있음)
        try {
          if (result.data.id) {
            const sentMsg = await gmail.users.messages.get({ userId: 'me', id: result.data.id })
            const labels = sentMsg.data.labelIds || []
            const sentConfirmed = Array.isArray(labels) && labels.includes('SENT')
            if (!sentConfirmed) {
              console.warn(`SENT 라벨이 즉시 확인되지 않았습니다: ${recipientEmail}`)
            }
          }
        } catch (verifyErr) {
          console.warn('Gmail sent verification check failed:', (verifyErr as any)?.message || verifyErr)
        }

        // Gmail API 호출 성공 시 성공으로 간주
        results.push({
          recipient: recipientEmail,
          status: 'success',
          messageId: result.data.id,
        })
      } catch (error: any) {
        const detailed = error?.response?.data?.error?.message || error?.message || String(error)
        console.error(`Email send error for ${recipientEmail}:`, detailed)
        errors.push({
          recipient: recipientEmail,
          status: 'failed',
          error: detailed || '발송 실패',
        })
      }
    }
    
    // 발송 기록 저장: public.emails_sent 테이블에 성공/실패 모두 기록
    try {
      const preview = (body || '').slice(0, 200)
      const rows = [
        ...results.map((r: any) => ({
          profile_id: user.id,
          project_id: requestBody.projectId || null,
          to_email: r.recipient,
          subject: subject,
          body: preview,
          provider: 'gmail',
          provider_message_id: r.messageId || null,
          status: 'sent',
          error_message: null,
          created_at: new Date().toISOString(),
        })),
        ...errors.map((e: any) => ({
          profile_id: user.id,
          project_id: requestBody.projectId || null,
          to_email: e.recipient,
          subject: subject,
          body: preview,
          provider: 'gmail',
          provider_message_id: null,
          status: 'failed',
          error_message: e.error || '발송 실패',
          created_at: new Date().toISOString(),
        })),
      ]
      if (rows.length > 0) {
        await supabase.from('emails_sent').insert(rows)
      }
    } catch (logErr) {
      console.error('Failed to insert emails_sent logs (gmail):', logErr)
    }
    
    // 항상 200으로 결과 요약 반환 (클라이언트가 sent/failed에 따라 메시지 표시)
    return NextResponse.json({
      success: errors.length === 0,
      sent: results.length,
      failed: errors.length,
      results,
      errors,
      ...(results.length === 0 ? { error: '모든 수신자에게 발송에 실패했습니다.' } : {}),
    })
  } catch (error: any) {
    console.error('Gmail send error:', error)
    return NextResponse.json({ 
      error: error.message || '이메일 발송 중 오류가 발생했습니다' 
    }, { status: 500 })
  }
}
