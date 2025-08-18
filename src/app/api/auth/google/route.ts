import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json()
    
    if (!idToken) {
      return NextResponse.json({ error: 'Google ID token이 필요합니다' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Google OAuth를 통한 로그인
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // 사용자 프로필 확인 및 생성
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // 프로필이 없으면 생성
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
          avatar_url: data.user.user_metadata?.avatar_url || '',
        })
      }
    }

    return NextResponse.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.user_metadata?.full_name || data.user?.user_metadata?.name || '',
        avatar_url: data.user?.user_metadata?.avatar_url || '',
      },
      session: data.session,
    })
  } catch (error) {
    console.error('Google login error:', error)
    return NextResponse.json({ error: '구글 로그인 처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}

// Google OAuth URL 생성
export async function GET(req: NextRequest) {
  try {
    // Supabase 환경변수 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables are missing')
      return NextResponse.json({ 
        error: 'Supabase 설정이 누락되었습니다. 환경 변수를 확인해주세요.' 
      }, { status: 500 })
    }
    
    const supabase = await createClient()

    // BASE_URL 계산 (env → 요청 origin → 로컬 기본값)
    const envBase = process.env.NEXT_PUBLIC_BASE_URL || ''
    const origin = req.headers.get('origin') || ''
    let baseUrl = envBase || origin || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '')
    if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
      // 프로토콜 누락 시 보정 (Supabase가 path로 해석하는 문제 방지)
      baseUrl = `https://${baseUrl}`
    }
    if (!baseUrl) {
      baseUrl = 'http://localhost:3001'
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('Supabase OAuth error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data || !data.url) {
      console.error('No OAuth URL returned from Supabase')
      return NextResponse.json({ error: 'OAuth URL이 반환되지 않았습니다' }, { status: 500 })
    }

    return NextResponse.json({ url: data.url })
  } catch (error) {
    console.error('Google OAuth URL error:', error)
    const errorMessage = error instanceof Error ? error.message : 'OAuth URL 생성 중 오류가 발생했습니다'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}