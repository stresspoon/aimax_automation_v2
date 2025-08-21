import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handles OAuth callback from Supabase (after Google consent)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const redirectTo = searchParams.get('next') || '/dashboard'

    if (!code) {
      // If no code, just go home
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Exchange the code for a session and set cookies via SSR helper
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
    }

    // 현재 로그인한 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // user_profiles 테이블에 사용자 정보 저장/업데이트
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          role: 'user', // 기본 역할
          plan: 'basic', // 기본 플랜
          status: 'active', // 활성 상태
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })

      if (profileError) {
        console.error('Error creating/updating user profile:', profileError)
      }

      // profiles 테이블도 업데이트 (호환성을 위해)
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          avatar_url: user.user_metadata?.avatar_url || '',
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
    }

    return NextResponse.redirect(new URL(redirectTo, request.url))
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', request.url))
  }
}