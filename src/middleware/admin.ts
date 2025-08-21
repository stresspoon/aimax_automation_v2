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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 사용자 세션 확인
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user) {
    // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
    console.log('[Admin Middleware] 로그인되지 않은 사용자')
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    url.searchParams.set('redirect', '/admin')
    return NextResponse.redirect(url)
  }

  console.log('[Admin Middleware] 로그인 사용자:', user.email)

  // 데이터베이스에서 역할 확인 시도
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // DB에서 역할 확인이 가능한 경우
  if (profile) {
    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
    if (!isAdmin) {
      console.log('[Admin Middleware] 관리자 권한 없음:', profile.role)
      // 관리자가 아닌 경우 홈으로 리다이렉트
      return NextResponse.redirect(new URL('/', request.url))
    }
  } else {
    // DB 확인 실패 시 이메일로 체크 (fallback)
    const isAdmin = user.email?.endsWith('@aimax.kr') || 
                     user.email === 'admin@aimax.kr'
    
    if (!isAdmin) {
      console.log('[Admin Middleware] 관리자 권한 없음 (이메일 체크):', user.email)
      // 관리자가 아닌 경우 홈으로 리다이렉트
      return NextResponse.redirect(new URL('/', request.url))
    }
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
  
  // 임시 구현
  return true
}