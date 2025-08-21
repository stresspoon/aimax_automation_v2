import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { adminMiddleware } from '@/middleware/admin'

export async function middleware(request: NextRequest) {
  // 관리자 페이지 접근 시 권한 체크
  if (request.nextUrl.pathname.startsWith('/admin')) {
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
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}