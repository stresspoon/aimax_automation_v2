import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { adminMiddleware } from '@/middleware/admin'

// 세션 갱신이 불필요한 API 경로 (웹훅, 공개 API 등)
const SKIP_SESSION_PATHS = [
  '/api/webhooks/',
  '/api/webhook/',
  '/api/payments/webhook',
  '/api/forms/webhook',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 웹훅/공개 API는 세션 갱신 불필요 → 바로 통과
  if (SKIP_SESSION_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 관리자 페이지 접근 시 권한 체크
  if (pathname.startsWith('/admin')) {
    return await adminMiddleware(request)
  }

  // 일반 세션 업데이트
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)',
  ],
}
