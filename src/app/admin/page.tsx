import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  Megaphone, 
  TrendingUp, 
  DollarSign,
  Activity,
  Download,
  Eye,
  UserPlus
} from 'lucide-react'

const stats = [
  {
    title: '전체 사용자',
    value: '1,234',
    change: '+12%',
    changeType: 'positive',
    icon: Users,
  },
  {
    title: '활성 캠페인',
    value: '56',
    change: '+8%',
    changeType: 'positive',
    icon: Megaphone,
  },
  {
    title: '월 매출',
    value: '₩12,345,678',
    change: '+23%',
    changeType: 'positive',
    icon: DollarSign,
  },
  {
    title: '전환율',
    value: '3.45%',
    change: '-2%',
    changeType: 'negative',
    icon: TrendingUp,
  },
]

const recentActivities = [
  {
    id: 1,
    user: '김철수',
    action: '새 캠페인 생성',
    campaign: '2024 여름 프로모션',
    time: '5분 전',
    icon: Megaphone,
  },
  {
    id: 2,
    user: '이영희',
    action: '회원 가입',
    campaign: '',
    time: '12분 전',
    icon: UserPlus,
  },
  {
    id: 3,
    user: '박민수',
    action: '리포트 다운로드',
    campaign: 'Q2 실적 분석',
    time: '30분 전',
    icon: Download,
  },
  {
    id: 4,
    user: '정수진',
    action: '캠페인 조회',
    campaign: '인스타그램 마케팅',
    time: '1시간 전',
    icon: Eye,
  },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500 mt-2">AIMAX 플랫폼 전체 현황을 한눈에 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
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
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change} from last month
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
            <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-400">
              차트 영역 (구현 예정)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>캠페인 성과</CardTitle>
            <CardDescription>플랫폼별 캠페인 성과 분석</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-400">
              차트 영역 (구현 예정)
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
            {recentActivities.map((activity) => {
              const Icon = activity.icon
              return (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      <span className="font-bold">{activity.user}</span>님이 {activity.action}
                      {activity.campaign && (
                        <span className="text-gray-600"> - {activity.campaign}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              )
            })}
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
                <p className="text-2xl font-bold">234</p>
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
                <p className="text-2xl font-bold text-green-600">정상</p>
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
                <p className="text-2xl font-bold">₩567,890</p>
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