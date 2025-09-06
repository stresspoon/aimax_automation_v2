import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ok, serverError, unauthorized } from '@/lib/http'


export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return unauthorized('인증이 필요합니다')
    }

    // 프로필 정보 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: profile?.full_name || profile?.username || user.email,
        phone: profile?.phone,
        companyName: profile?.company_name,
      },
    })
  } catch (error) {
    console.error('Get user error')
    return serverError('사용자 정보를 가져오는 중 오류가 발생했습니다')
  }
}
