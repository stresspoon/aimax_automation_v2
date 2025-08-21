import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { verifyAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  // 관리자 권한 확인
  const { user, error } = await verifyAdmin(request)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 403 })
  }

  // Service Role 키를 사용하여 RLS 우회
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

  try {
    // 날짜 계산
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // 모든 쿼리를 병렬로 실행
    const [
      totalUsersResult,
      activeUsersResult,
      newUsersTodayResult,
      activeCampaignsResult,
      totalCampaignsResult,
      planStatsResult,
      recentActivitiesResult,
      monthlyUsersResult
    ] = await Promise.all([
      // 1. 전체 사용자 수
      supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true }),
      
      // 2. 활성 사용자 수 (최근 7일 이내 로그인)
      supabase
        .from('user_profiles')
        .select('updated_at')
        .gte('updated_at', sevenDaysAgo.toISOString()),
      
      // 3. 오늘 신규 가입자
      supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      
      // 4. 활성 캠페인 수
      supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      
      // 5. 전체 캠페인 수
      supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true }),
      
      // 6. 플랜별 사용자 수
      supabase
        .from('user_profiles')
        .select('plan'),
      
      // 7. 최근 활동 로그 (최근 10개)
      supabase
        .from('activity_logs')
        .select(`
          *,
          user:user_profiles!activity_logs_user_id_fkey(
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10),
      
      // 8. 월별 가입자 추이 (최근 6개월)
      supabase
        .from('user_profiles')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
    ])

    // 플랜별 집계
    const planCounts = planStatsResult.data?.reduce((acc: any, user) => {
      acc[user.plan] = (acc[user.plan] || 0) + 1
      return acc
    }, {}) || {}

    // 월별 집계
    const monthlyGrowth = monthlyUsersResult.data?.reduce((acc: any, user) => {
      const month = new Date(user.created_at).toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'short' 
      })
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {}) || {}

    // 통계 계산
    const totalUsers = totalUsersResult.count || 0
    const totalCampaigns = totalCampaignsResult.count || 0
    const activeCampaigns = activeCampaignsResult.count || 0
    const monthlyRevenue = totalUsers * 50000 // 임시 계산
    const conversionRate = totalCampaigns ? 
      ((activeCampaigns) / totalCampaigns * 100).toFixed(2) : 0

    const stats = {
      overview: {
        totalUsers,
        activeUsers: activeUsersResult.data?.length || 0,
        newUsersToday: newUsersTodayResult.count || 0,
        totalCampaigns,
        activeCampaigns,
        monthlyRevenue,
        conversionRate: parseFloat(conversionRate as string),
      },
      planDistribution: {
        basic: planCounts.basic || 0,
        pro: planCounts.pro || 0,
        enterprise: planCounts.enterprise || 0,
      },
      recentActivities: recentActivitiesResult.data?.map(activity => ({
        id: activity.id,
        action: activity.action,
        details: activity.details,
        userName: activity.user?.full_name || activity.user?.email || '알 수 없음',
        userEmail: activity.user?.email,
        createdAt: activity.created_at,
      })) || [],
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

    // 캐시 헤더 추가 (1분간 캐싱)
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
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