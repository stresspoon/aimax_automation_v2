import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'
import { getActivityLogs } from '@/lib/activity-logger'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdmin(request)
    if (adminResult.error) {
      return NextResponse.json(
        { error: adminResult.error.message },
        { status: adminResult.error.status }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const userId = searchParams.get('userId') || undefined
    const action = searchParams.get('action') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const campaignId = searchParams.get('campaignId') || undefined

    // campaignId 필터가 없으면 기존 헬퍼 사용 (성능 유지)
    if (!campaignId) {
      const { logs, total } = await getActivityLogs(
        limit,
        offset,
        userId,
        action,
        startDate,
        endDate
      )

      return NextResponse.json({
        logs,
        total,
        limit,
        offset
      })
    }

    // campaignId 필터가 있으면 직접 쿼리 (details JSONB 내 필드 조회)
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

    let query = supabase
      .from('activity_logs')
      .select('*, user_profiles(email, role)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (userId) query = query.eq('user_id', userId)
    if (action) query = query.eq('action', action)
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    // details JSONB: campaign_id 또는 project_id로 저장된 경우를 모두 지원
    query = query.or(
      `details->>campaign_id.eq.${campaignId},details->>project_id.eq.${campaignId}`
    )

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      logs: data || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error: any) {
    console.error('Activity logs fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity logs' },
      { status: 500 }
    )
  }
}