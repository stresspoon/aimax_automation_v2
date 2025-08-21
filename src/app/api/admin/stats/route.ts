import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  // 관리자 권한 확인
  const adminResult = await verifyAdmin(request)
  if (adminResult.error) {
    return NextResponse.json({ error: adminResult.error.message }, { status: adminResult.error.status || 403 })
  }

  // Service Role 키로 순수 서버 클라이언트 생성 (세션/쿠키 비사용)
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

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

    // 1. 전체 사용자 수 - 모든 데이터를 가져와서 카운트
    const { data: allUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
    }

    // 2. 활성 사용자 수 (최근 7일 이내 업데이트)
    const { data: activeUsers } = await supabase
      .from('user_profiles')
      .select('*')
      .gte('updated_at', sevenDaysAgo.toISOString())

    // 3. 오늘 신규 가입자
    const { data: newUsersToday } = await supabase
      .from('user_profiles')
      .select('*')
      .gte('created_at', today.toISOString())

    // 4. 캠페인 통계
    const { data: allCampaigns } = await supabase
      .from('campaigns')
      .select('*')
    
    const activeCampaigns = allCampaigns?.filter(c => c.status === 'active') || []

    // 5. 최근 활동 로그
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

    // 6. 월별 가입자 추이
    const { data: monthlyUsers } = await supabase
      .from('user_profiles')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString())

    // 플랜별 집계
    const planCounts = (allUsers || []).reduce((acc: any, user) => {
      const plan = user.plan || 'basic'
      acc[plan] = (acc[plan] || 0) + 1
      return acc
    }, {})

    // 월별 집계
    const monthlyGrowth = (monthlyUsers || []).reduce((acc: any, user) => {
      const month = new Date(user.created_at).toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'short' 
      })
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {})

    // 통계 계산
    const totalUsers = allUsers?.length || 0
    const totalCampaigns = allCampaigns?.length || 0
    const activeCampaignsCount = activeCampaigns.length
    const monthlyRevenue = totalUsers * 50000 // 임시 계산
    const conversionRate = totalCampaigns ? 
      ((activeCampaignsCount) / totalCampaigns * 100).toFixed(2) : 0

    // 디버깅 로그
    console.log('Stats API Result:', {
      totalUsers,
      allUsersCount: allUsers?.length,
      activeUsersCount: activeUsers?.length,
      newUsersTodayCount: newUsersToday?.length,
      planCounts
    })

    const stats: any = {
      overview: {
        totalUsers,
        activeUsers: activeUsers?.length || 0,
        newUsersToday: newUsersToday?.length || 0,
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
        todayRevenue: Math.floor(monthlyRevenue / 30),
        serverStatus: 'healthy',
        pendingTasks: 0,
      }
    }

    if (debug) {
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https?:\/\/(.*?)\.supabase\.co/i)?.[1]
      stats.debug = {
        projectRef,
        allUsersCount: allUsers?.length || 0,
        activeUsersCount: activeUsers?.length || 0,
        newUsersTodayCount: newUsersToday?.length || 0,
        planCounts,
      }
    }

    // 캐시 헤더 추가 (30초간 캐싱)
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=15',
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