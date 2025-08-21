import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'

interface VerifyAdminSuccess {
  user: User
  error: null
}

interface VerifyAdminError {
  user?: null
  error: {
    message: string
    status: number
  }
}

type VerifyAdminResult = VerifyAdminSuccess | VerifyAdminError

export async function verifyAdmin(request: NextRequest): Promise<VerifyAdminResult> {
  const supabase = await createClient()
  
  // 현재 사용자 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return {
      user: null,
      error: {
        message: '인증되지 않은 요청입니다',
        status: 401
      }
    }
  }

  // 관리자 권한 확인
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    // 프로필이 없는 경우 이메일로 체크
    const isAdminEmail = user.email?.endsWith('@aimax.kr') || 
                         user.email === 'admin@aimax.kr'
    
    if (!isAdminEmail) {
      return {
        user: null,
        error: {
          message: '관리자 권한이 필요합니다',
          status: 403
        }
      }
    }
  } else {
    // 역할 확인
    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
    if (!isAdmin) {
      return {
        user: null,
        error: {
          message: '관리자 권한이 필요합니다',
          status: 403
        }
      }
    }
  }

  return { user, error: null }
}