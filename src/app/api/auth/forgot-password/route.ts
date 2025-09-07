import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { badRequest, ok, serverError } from '@/lib/http'
import { ForgotPasswordSchema } from '@/app/api/auth/schema'
import { ipKey, rateLimit } from '@/lib/rateLimit'


export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit(ipKey(request as unknown as Request, 'auth:forgot'), { windowMs: 60_000, max: 5 })
    if (!rl.allowed) return badRequest('요청이 너무 많습니다. 잠시 후 다시 시도하세요.')

    const body = await request.json()
    const parsed = ForgotPasswordSchema.safeParse(body)
    if (!parsed.success) return badRequest('입력값이 올바르지 않습니다', parsed.error.flatten())
    const { email } = parsed.data

    const supabase = await createClient()

    // Supabase의 비밀번호 재설정 기능 사용
    const base = process.env.NEXT_PUBLIC_BASE_URL || `${request.headers.get('origin') || 'http://localhost:3001'}`
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${base}/reset-password`,
    });

    if (error) {
      console.error('Password reset error')
      return serverError('비밀번호 재설정 요청 중 오류가 발생했습니다')
    }

    // 보안을 위해 사용자 존재 여부와 관계없이 항상 성공 응답 반환
    return ok({ success: true, message: '비밀번호 재설정 이메일을 전송했습니다' })
  } catch (error) {
    console.error('Forgot password error')
    return serverError('비밀번호 재설정 요청 중 오류가 발생했습니다')
  }
}
