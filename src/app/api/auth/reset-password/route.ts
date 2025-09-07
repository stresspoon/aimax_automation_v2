import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { badRequest, ok, serverError } from '@/lib/http'
import { ResetPasswordSchema } from '@/app/api/auth/schema'


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = ResetPasswordSchema.safeParse(body)
    if (!parsed.success) return badRequest('입력값이 올바르지 않습니다', parsed.error.flatten())
    const { code, password } = parsed.data

    const supabase = await createClient()

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return badRequest('유효하지 않거나 만료된 토큰입니다')
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      return serverError('비밀번호 변경 중 오류가 발생했습니다')
    }

    return ok({ success: true, message: '비밀번호가 성공적으로 변경되었습니다' })
  } catch (error) {
    console.error('Reset password error')
    return serverError('비밀번호 재설정 중 오류가 발생했습니다')
  }
}
