import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { badRequest, created, ok, serverError, conflict } from '@/lib/http'
import { SignupSchema } from '@/app/api/auth/schema'
import { ipKey, rateLimit } from '@/lib/rateLimit'


export async function POST(request: NextRequest) {
  try {
    // rate limit: signup bursts
    const rl = rateLimit(ipKey(request as unknown as Request, 'auth:signup'), { windowMs: 60_000, max: 10 })
    if (!rl.allowed) return badRequest('요청이 너무 많습니다. 잠시 후 다시 시도하세요.')

    const body = await request.json()
    const parsed = SignupSchema.safeParse(body)
    if (!parsed.success) return badRequest('입력값이 올바르지 않습니다', parsed.error.flatten())
    const { email, password, name, phone, companyName, agreeMarketing } = parsed.data

    const supabase = await createClient()

    // Supabase로 사용자 생성
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone,
          company_name: companyName,
          agree_marketing: agreeMarketing || false,
        }
      }
    })

    if (error) {
      if (error.message.includes('already registered')) {
        return conflict('이미 사용 중인 이메일입니다')
      }
      throw error;
    }

    if (!data.user) {
      return serverError('회원가입 중 오류가 발생했습니다')
    }

    // user_profiles 테이블에 사용자 추가 (관리자 대시보드용)
    await supabase
      .from('user_profiles')
      .upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: name,
        role: 'user', // 기본 역할
        plan: 'basic', // 기본 플랜
        status: 'active', // 활성 상태
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })

    // profiles 테이블도 업데이트 (호환성을 위해 - 나중에 제거 예정)
    await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email,
        full_name: name,
        name,
        phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })

    return created({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: name,
      },
    })
  } catch (error: any) {
    console.error('Signup error')
    return serverError('회원가입 중 오류가 발생했습니다')
  }
}
