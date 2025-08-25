'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Megaphone, 
  TrendingUp, 
  DollarSign,
  Activity,
  Download,
  Eye,
  UserPlus,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface DashboardStats {
  overview: {
    totalUsers: number
    activeUsers: number
    newUsersToday: number
    totalCampaigns: number
    activeCampaigns: number
    monthlyRevenue: number
    conversionRate: number
  }
  planDistribution: {
    basic: number
    pro: number
    enterprise: number
  }
  recentActivities: Array<{
    id: string
    action: string
    details: any
    userName: string
    userEmail: string
    createdAt: string
  }>
  monthlyGrowth: Array<{
    month: string
    users: number
  }>
  quickStats: {
    todayRevenue: number
    serverStatus: string
    pendingTasks: number
  }
}

export default function AdminDashboard() {
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStats = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true)
      
      const response = await fetch('/api/admin/stats')
      if (!response.ok) {
        throw new Error('통계 데이터를 불러올 수 없습니다')
      }
      
      const data = await response.json()
      setStats(data)
      
      if (showToast) {
        toast({
          title: '성공',
          description: '통계가 업데이트되었습니다'
        })
      }
    } catch (error) {
      console.error('Stats fetch error:', error)
      toast({
        title: '오류',
        description: '통계 데이터 로딩 실패',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // 3분마다 자동 새로고침 (너무 자주 하지 않도록)
    const interval = setInterval(() => fetchStats(), 180000)
    return () => clearInterval(interval)
  }, [])

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    return `${days}일 전`
  }

  const getActionIcon = (action: string) => {
    if (action.includes('프로젝트')) return Megaphone
    if (action.includes('가입')) return UserPlus
    if (action.includes('다운로드')) return Download
    return Eye
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
            <p className="text-gray-500 mt-2">실시간 플랫폼 현황을 확인하세요</p>
          </div>
        </div>

        {/* 로딩 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const statsCards = [
    {
      title: '전체 사용자',
      value: stats?.overview.totalUsers || 0,
      change: stats?.overview.newUsersToday 
        ? `오늘 +${stats.overview.newUsersToday}명`
        : '변동 없음',
      changeType: stats?.overview.newUsersToday ? 'positive' : 'neutral' as const,
      icon: Users,
    },
    {
      title: '활성 프로젝트',
      value: stats?.overview.activeCampaigns || 0,
      change: `전체 ${stats?.overview.totalCampaigns || 0}개`,
      changeType: 'neutral' as const,
      icon: Megaphone,
    },
    {
      title: '월 매출',
      value: `₩${(stats?.overview.monthlyRevenue || 0).toLocaleString()}`,
      change: '예상 매출',
      changeType: 'neutral' as const,
      icon: DollarSign,
    },
    {
      title: '전환율',
      value: `${stats?.overview.conversionRate || 0}%`,
      change: '프로젝트 성공률',
      changeType: 'neutral' as const,
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6">
      {/* 네비게이션 링크 */}
      <div className="flex gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => window.location.href = '/admin'}
          className="text-sm font-medium"
        >
          대시보드
        </Button>
        <Button
          variant="ghost"
          onClick={() => window.location.href = '/admin/users'}
          className="text-sm font-medium"
        >
          사용자 관리
        </Button>
        <Button
          variant="ghost"
          onClick={() => window.location.href = '/admin/projects'}
          className="text-sm font-medium"
        >
          프로젝트 모니터링
        </Button>
      </div>

      {/* 페이지 타이틀 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500 mt-2">AIMAX 플랫폼 전체 현황을 한눈에 확인하세요</p>
        </div>
        <Button 
          onClick={() => fetchStats(true)}
          disabled={isRefreshing}
          variant="outline"
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="ml-2">새로고침</span>
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs ${
                  stat.changeType === 'positive' ? 'text-green-600' : 
                  stat.changeType === 'negative' ? 'text-red-600' : 
                  'text-gray-500'
                }`}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>사용자 증가 추이</CardTitle>
            <CardDescription>최근 6개월간 사용자 증가 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded flex flex-col items-center justify-center text-gray-400">
              <p>차트 영역 (구현 예정)</p>
              {stats?.monthlyGrowth && stats.monthlyGrowth.length > 0 && (
                <div className="mt-4 text-xs">
                  {stats.monthlyGrowth.map(item => (
                    <div key={item.month}>
                      {item.month}: {item.users}명
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>플랜별 사용자 분포</CardTitle>
            <CardDescription>요금제별 사용자 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Basic</span>
                <span className="text-sm text-gray-500">
                  {stats?.planDistribution.basic || 0}명
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pro</span>
                <span className="text-sm text-gray-500">
                  {stats?.planDistribution.pro || 0}명
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Enterprise</span>
                <span className="text-sm text-gray-500">
                  {stats?.planDistribution.enterprise || 0}명
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 활동 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
          <CardDescription>플랫폼 내 최근 사용자 활동 내역</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity) => {
                const Icon = getActionIcon(activity.action)
                return (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="font-bold">{activity.userName}</span>님이 {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-gray-500">아직 활동 내역이 없습니다</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">사용자 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {stats?.overview.newUsersToday || 0}
                </p>
                <p className="text-sm text-gray-500">오늘 신규 가입</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">서버 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.quickStats.serverStatus === 'healthy' ? '정상' : '점검중'}
                </p>
                <p className="text-sm text-gray-500">모든 서비스 운영중</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">일일 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  ₩{(stats?.quickStats.todayRevenue || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">오늘 매출액</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}