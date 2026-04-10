import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { badRequest, ok, serverError, unauthorized, tooMany } from '@/lib/http'
import { LoginSchema } from '@/app/api/auth/schema'
import { ipKey, rateLimit } from '@/lib/rateLimit'


export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const key = ipKey(request as unknown as Request, 'auth:login')
    const rl = rateLimit(key, { windowMs: 60_000, max: 10 })
    if (!rl.allowed) return tooMany('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.', rl.retryAfterSec)

    const body = await request.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) return badRequest('입력값이 올바르지 않습니다', parsed.error.flatten())
    const { email, password } = parsed.data

    // 입력값 검증
    const supabase = await createClient()

    // Supabase 로그인
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return unauthorized('이메일 또는 비밀번호가 올바르지 않습니다')
    }

    if (!data.user) {
      return serverError('로그인 중 오류가 발생했습니다')
    }

    // 프로필 정보 가져오기 (user_profiles 우선, profiles fallback)
    let profile = null;
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, username, role, plan, status, created_at')
      .eq('id', data.user.id)
      .single();

    if (userProfile) {
      profile = userProfile;
    } else {
      // fallback to profiles table
      const { data: legacyProfile } = await supabase
        .from('profiles')
        .select('id, full_name, name, username, role, plan, status, created_at')
        .eq('id', data.user.id)
        .single();
      profile = legacyProfile;
      
      // user_profiles에 자동 생성
      if (legacyProfile) {
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: legacyProfile.full_name || legacyProfile.name,
          role: legacyProfile.role || 'user',
          plan: legacyProfile.plan || 'basic',
          status: legacyProfile.status || 'active',
          created_at: legacyProfile.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });
      }
    }

    return ok({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.full_name || profile?.username || data.user.email,
      },
    })
  } catch (error) {
    console.error('Login error')
    return serverError('로그인 중 오류가 발생했습니다')
  }
}
