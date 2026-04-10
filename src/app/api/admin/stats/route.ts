import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  // 관리자 권한 확인
  const adminResult = await verifyAdmin(request)
  if (adminResult.error) {
    return NextResponse.json({ error: adminResult.error.message }, { status: adminResult.error.status || 403 })
  }

  // 싱글톤 Admin 클라이언트 사용 (매번 인스턴스 생성 → 재사용)
  const supabase = createAdminClient()

  try {
    const searchParams = request.nextUrl.searchParams
    const debug = searchParams.get('debug') === '1'

    // 날짜 계산
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // 병렬로 모든 쿼리 실행 (순차 5회 → 병렬 1회)
    const [
      allUsersResult,
      activeUsersResult,
      newUsersTodayResult,
      allCampaignsResult,
      recentActivitiesResult,
      monthlyUsersResult,
    ] = await Promise.all([
      // 1. 전체 사용자 - 필요한 컬럼만 선택 (select('*') → 최소 컬럼)
      supabase
        .from('user_profiles')
        .select('id, plan, created_at'),

      // 2. 활성 사용자 수 - count만 필요 (전체 row 페치 → head count)
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', sevenDaysAgo.toISOString()),

      // 3. 오늘 신규 가입자 - count만 필요
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),

      // 4. 캠페인 통계 - 필요한 컬럼만
      supabase
        .from('campaigns')
        .select('id, status'),

      // 5. 최근 활동 로그 - 필요한 컬럼만 (select('*') 제거)
      supabase
        .from('activity_logs')
        .select(`
          id, action, details, created_at,
          user:user_profiles!activity_logs_user_id_fkey(
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10),

      // 6. 월별 가입자 추이
      supabase
        .from('user_profiles')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString()),
    ])

    const allUsers = allUsersResult.data || []
    const allCampaigns = allCampaignsResult.data || []
    const recentActivities = recentActivitiesResult.data || []
    const monthlyUsers = monthlyUsersResult.data || []
    const activeCampaigns = allCampaigns.filter(c => c.status === 'active')

    // 플랜별 집계
    const planCounts = allUsers.reduce((acc: Record<string, number>, user) => {
      const plan = user.plan || 'basic'
      acc[plan] = (acc[plan] || 0) + 1
      return acc
    }, {})

    // 월별 집계
    const monthlyGrowth = monthlyUsers.reduce((acc: Record<string, number>, user) => {
      const month = new Date(user.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short'
      })
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {})

    // 통계 계산
    const totalUsers = allUsers.length
    const totalCampaigns = allCampaigns.length
    const activeCampaignsCount = activeCampaigns.length
    const monthlyRevenue = totalUsers * 50000 // 임시 계산
    const conversionRate = totalCampaigns ?
      ((activeCampaignsCount) / totalCampaigns * 100).toFixed(2) : 0

    const stats: Record<string, unknown> = {
      overview: {
        totalUsers,
        activeUsers: activeUsersResult.count ?? 0,
        newUsersToday: newUsersTodayResult.count ?? 0,
        totalCampaigns,
        activeCampaigns: activeCampaignsCount,
        monthlyRevenue,
        conversionRate: parseFloat(conversionRate as string),
      },
      planDistribution: {
        basic: planCounts.basic || 0,
        pro: planCounts.pro || 0,
        enterprise: planCounts.enterprise || 0,
      },
      recentActivities: recentActivities.map((activity: any) => ({
        id: activity.id,
        action: activity.action,
        details: activity.details,
        userName: activity.user?.full_name || activity.user?.email || '알 수 없음',
        userEmail: activity.user?.email,
        createdAt: activity.created_at,
      })),
      monthlyGrowth: Object.entries(monthlyGrowth).map(([month, count]) => ({
        month,
        users: count,
      })),
      quickStats: {
        todayRevenue: Math.floor(monthlyRevenue / 30),
        serverStatus: 'healthy',
        pendingTasks: 0,
      }
    }

    if (debug) {
      stats.debug = {
        allUsersCount: allUsers.length,
        activeUsersCount: activeUsersResult.count ?? 0,
        newUsersTodayCount: newUsersTodayResult.count ?? 0,
        planCounts,
      }
    }

    // 캐시 헤더 추가 (30초간 캐싱)
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=15',
      },
    })
  } catch (error) {
    console.error('통계 조회 오류:', error)
    return NextResponse.json(
      { error: '통계 데이터를 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
