import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { verifyAdmin } from '@/lib/admin-auth'

// POST /api/activity/log
// body: { action: string, details?: object, campaign_id?: string, project_id?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, details = {}, campaign_id, project_id } = body || {}

    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // 우선 사용자 세션으로 식별
    let userId: string | null = null
    const { data: authData } = await supabase.auth.getUser()
    userId = authData?.user?.id || null

    // 세션이 없으면 관리자 토큰 검증 허용
    if (!userId) {
      const admin = await verifyAdmin(req)
      if (admin.user) userId = admin.user.id
    }

    const payload: any = {
      user_id: userId,
      action,
      details: { ...(details || {}), ...(campaign_id ? { campaign_id } : {}), ...(project_id ? { project_id } : {}) }
    }

    const { error } = await supabase.from('activity_logs').insert(payload)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('activity log error:', e)
    return NextResponse.json({ error: e?.message || 'failed to log activity' }, { status: 500 })
  }
}
