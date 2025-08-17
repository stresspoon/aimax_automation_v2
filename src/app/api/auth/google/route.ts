import { NextResponse } from 'next/server'
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
      const { data: profile, error: profileError } = await supabase
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
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ url: data.url })
  } catch (error) {
    console.error('Google OAuth URL error:', error)
    return NextResponse.json({ error: 'OAuth URL 생성 중 오류가 발생했습니다' }, { status: 500 })
  }
}