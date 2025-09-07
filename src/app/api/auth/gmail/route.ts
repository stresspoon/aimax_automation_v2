import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { badRequest, ok, serverError, unauthorized } from '@/lib/http'
import { GmailConnectSchema } from '@/app/api/auth/schema'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return unauthorized('인증이 필요합니다')
    }
    
    // BASE_URL 확인 및 기본값 설정
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://aimax.vercel.app')
    
    // Gmail OAuth용 Google 로그인
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/gmail-callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'email profile https://www.googleapis.com/auth/gmail.send',
      },
    })

    if (error) {
      console.error('Gmail OAuth error')
      return badRequest(error.message)
    }

    if (!data || !data.url) {
      return serverError('OAuth URL이 반환되지 않았습니다')
    }

    return NextResponse.json({ url: data.url })
  } catch (error) {
    console.error('Gmail OAuth URL error')
    return serverError('Gmail OAuth URL 생성 중 오류가 발생했습니다')
  }
}

// Gmail 연결 상태 확인
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return unauthorized('인증이 필요합니다')
    }
    const parsed = GmailConnectSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest('입력값이 올바르지 않습니다', parsed.error.flatten())
    const { accessToken, refreshToken, email } = parsed.data
    
    // Gmail 연결 정보 저장 (먼저 기존 연결 삭제)
    const { error: deleteError } = await supabase
      .from('gmail_connections')
      .delete()
      .eq('user_id', user.id)
    
    if (deleteError) {
      console.error('기존 연결 삭제 오류')
    }
    
    // 새로운 연결 정보 저장
    const { error } = await supabase
      .from('gmail_connections')
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
      console.error('Gmail connection save error')
      return serverError('연결 정보 저장 실패')
    }
    
    return ok({ success: true, email })
  } catch (error) {
    console.error('Gmail connection error')
    return serverError('Gmail 연결 중 오류가 발생했습니다')
  }
}

// Gmail 연결 해제
export async function DELETE() {
  try {
    const supabase = await createClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return unauthorized('인증이 필요합니다')
    }
    
    // Gmail 연결 정보 삭제
    const { error } = await supabase
      .from('gmail_connections')
      .delete()
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Gmail disconnection error')
      return serverError('연결 해제 실패')
    }
    
    return ok({ success: true })
  } catch (error) {
    console.error('Gmail disconnection error')
    return serverError('Gmail 연결 해제 중 오류가 발생했습니다')
  }
}
