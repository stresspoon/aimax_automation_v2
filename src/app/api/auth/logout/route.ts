import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ok, serverError } from '@/lib/http'


export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Supabase 로그아웃
    await supabase.auth.signOut()

    return ok({ success: true, message: '로그아웃되었습니다' })
  } catch (error) {
    console.error('Logout error')
    return serverError('로그아웃 중 오류가 발생했습니다')
  }
}
