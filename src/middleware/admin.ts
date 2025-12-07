import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function adminMiddleware(request: NextRequest) {
  // 로그인 페이지는 미들웨어 체크 제외
  if (request.nextUrl.pathname === '/signin') {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 사용자 세션 확인
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
    console.log('[Admin Middleware] 로그인되지 않은 사용자')
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    url.searchParams.set('redirect', '/admin')
    return NextResponse.redirect(url)
  }

  // 데이터베이스에서 역할 확인 시도 (DB 결과만 신뢰)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = !!profile && (profile.role === 'admin' || profile.role === 'super_admin')
  if (!isAdmin) {
    // 과도한 PII 로깅을 피하고 최소 정보만 기록
    console.log('[Admin Middleware] 권한 거부 - user:', user.id)
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

// 관리자 역할 확인 헬퍼 함수
export async function checkAdminRole(userId: string): Promise<boolean> {
  // TODO: Supabase에서 사용자 역할 확인
  // const { data, error } = await supabase
  //   .from('user_roles')
  //   .select('role')
  //   .eq('user_id', userId)
  //   .single()
  // 
  // return data?.role === 'admin'

  // 안전한 기본값
  return false
}
