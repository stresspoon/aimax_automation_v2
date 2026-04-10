import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { badRequest, created, serverError, conflict } from '@/lib/http'
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

    // 1차 시도: 일반 signUp (이메일 확인 포함)
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

      // DB 트리거 실패 시 admin API로 fallback
      if (error.message.includes('Database error')) {
        console.warn('Signup trigger failed, falling back to admin createUser:', error.message)
        return await adminSignupFallback(email, password, name, phone, companyName, agreeMarketing)
      }

      throw error
    }

    if (!data.user) {
      return serverError('회원가입 중 오류가 발생했습니다')
    }

    // 트리거가 성공했으므로 프로필 upsert (트리거와 중복되어도 ON CONFLICT로 안전)
    await ensureProfiles(supabase, data.user.id, data.user.email!, name, phone)

    return created({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name,
      },
    })
  } catch (error: any) {
    console.error('Signup error:', error?.message || error)
    return serverError('회원가입 중 오류가 발생했습니다')
  }
}

/**
 * DB 트리거 실패 시 admin API로 사용자 생성 후 프로필을 수동 생성
 */
async function adminSignupFallback(
  email: string,
  password: string,
  name: string,
  phone: string,
  companyName?: string,
  agreeMarketing?: boolean,
) {
  const admin = createAdminClient()

  // admin API로 사용자 생성 (email_confirm: false → 이메일 확인 필요)
  const { data: adminData, error: adminError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      full_name: name,
      phone,
      company_name: companyName,
      agree_marketing: agreeMarketing || false,
    },
  })

  if (adminError) {
    if (adminError.message.includes('already been registered') || adminError.message.includes('already exists')) {
      return conflict('이미 사용 중인 이메일입니다')
    }
    console.error('Admin signup fallback failed:', adminError.message)
    return serverError('회원가입 중 오류가 발생했습니다')
  }

  if (!adminData.user) {
    return serverError('회원가입 중 오류가 발생했습니다')
  }

  // 트리거가 실패했으므로 프로필을 수동 생성 (admin client로 RLS 우회)
  await ensureProfiles(admin, adminData.user.id, email, name, phone)

  return created({
    success: true,
    user: {
      id: adminData.user.id,
      email: adminData.user.email,
      name,
    },
  })
}

/**
 * user_profiles + profiles 테이블에 레코드 보장 (upsert)
 */
async function ensureProfiles(
  client: any,
  userId: string,
  email: string,
  name: string,
  phone: string,
) {
  const now = new Date().toISOString()

  // user_profiles (관리자 대시보드용)
  const { error: upErr } = await client
    .from('user_profiles')
    .upsert({
      id: userId,
      email,
      full_name: name,
      role: 'user',
      plan: 'basic',
      status: 'active',
      created_at: now,
      updated_at: now,
    }, { onConflict: 'id', ignoreDuplicates: false })

  if (upErr) console.warn('user_profiles upsert warning:', upErr.message)

  // profiles (호환성 유지)
  const { error: pErr } = await client
    .from('profiles')
    .upsert({
      id: userId,
      email,
      name,
      phone,
      created_at: now,
      updated_at: now,
    }, { onConflict: 'id', ignoreDuplicates: false })

  if (pErr) console.warn('profiles upsert warning:', pErr.message)
}
