import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  // 관리자 권한 확인
  const { user, error } = await verifyAdmin(request)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 403 })
  }

  const supabase = await createClient()

  try {
    // 1. 전체 사용자 수
    const { count: totalUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    // 2. 활성 사용자 수 (최근 7일 이내 로그인)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: activeUsers } = await supabase
      .from('auth.users')
      .select('last_sign_in_at')
      .gte('last_sign_in_at', sevenDaysAgo.toISOString())

    // 3. 오늘 신규 가입자
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: newUsersToday } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    // 4. 활성 캠페인 수
    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // 5. 전체 캠페인 수
    const { count: totalCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })

    // 6. 플랜별 사용자 수
    const { data: planStats } = await supabase
      .from('user_profiles')
      .select('plan')

    const planCounts = planStats?.reduce((acc: any, user) => {
      acc[user.plan] = (acc[user.plan] || 0) + 1
      return acc
    }, {}) || {}

    // 7. 최근 활동 로그 (최근 10개)
    const { data: recentActivities } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user:user_profiles!activity_logs_user_id_fkey(
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    // 8. 월별 가입자 추이 (최근 6개월)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const { data: monthlyUsers } = await supabase
      .from('user_profiles')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString())

    // 월별로 그룹화
    const monthlyGrowth = monthlyUsers?.reduce((acc: any, user) => {
      const month = new Date(user.created_at).toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'short' 
      })
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {}) || {}

    // 9. 이번 달 예상 매출 (임시 데이터)
    const monthlyRevenue = totalUsers ? totalUsers * 50000 : 0 // 임시 계산

    // 10. 전환율 계산 (임시)
    const conversionRate = totalCampaigns ? 
      ((activeCampaigns || 0) / totalCampaigns * 100).toFixed(2) : 0

    const stats = {
      overview: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers?.length || 0,
        newUsersToday: newUsersToday || 0,
        totalCampaigns: totalCampaigns || 0,
        activeCampaigns: activeCampaigns || 0,
        monthlyRevenue,
        conversionRate: parseFloat(conversionRate as string),
      },
      planDistribution: {
        basic: planCounts.basic || 0,
        pro: planCounts.pro || 0,
        enterprise: planCounts.enterprise || 0,
      },
      recentActivities: recentActivities?.map(activity => ({
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
        todayRevenue: Math.floor(monthlyRevenue / 30), // 일일 매출 추정
        serverStatus: 'healthy',
        pendingTasks: 0,
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('통계 조회 오류:', error)
    return NextResponse.json(
      { error: '통계 데이터를 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}