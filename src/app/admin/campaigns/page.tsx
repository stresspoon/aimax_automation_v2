'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search, 
  Filter,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  MoreVertical,
  Calendar,
  Target
} from 'lucide-react'

// 임시 캠페인 데이터
const campaigns = [
  {
    id: 1,
    name: '2024 여름 프로모션',
    user: '김철수',
    platform: 'Instagram',
    status: 'running',
    startDate: '2024-07-01',
    endDate: '2024-08-31',
    budget: 5000000,
    spent: 3200000,
    impressions: 1234567,
    clicks: 45678,
    conversions: 234,
    ctr: 3.7,
    progress: 64,
  },
  {
    id: 2,
    name: '신제품 런칭 캠페인',
    user: '이영희',
    platform: 'Threads',
    status: 'paused',
    startDate: '2024-06-15',
    endDate: '2024-07-15',
    budget: 3000000,
    spent: 1800000,
    impressions: 890123,
    clicks: 23456,
    conversions: 156,
    ctr: 2.6,
    progress: 60,
  },
  {
    id: 3,
    name: '브랜드 인지도 향상',
    user: '박민수',
    platform: 'Naver Blog',
    status: 'running',
    startDate: '2024-07-10',
    endDate: '2024-09-10',
    budget: 8000000,
    spent: 2400000,
    impressions: 2345678,
    clicks: 67890,
    conversions: 456,
    ctr: 2.9,
    progress: 30,
  },
  {
    id: 4,
    name: 'Q3 세일즈 캠페인',
    user: '정수진',
    platform: 'Instagram',
    status: 'completed',
    startDate: '2024-04-01',
    endDate: '2024-06-30',
    budget: 10000000,
    spent: 9800000,
    impressions: 5678901,
    clicks: 123456,
    conversions: 789,
    ctr: 2.2,
    progress: 100,
  },
]

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      running: "default",
      paused: "secondary",
      completed: "outline",
      failed: "destructive"
    }
    const labels: Record<string, string> = {
      running: "진행중",
      paused: "일시정지",
      completed: "완료",
      failed: "실패"
    }
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getPlatformBadge = (platform: string) => {
    const colors: Record<string, string> = {
      Instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
      Threads: "bg-black",
      "Naver Blog": "bg-green-600"
    }
    return (
      <Badge className={`${colors[platform]} text-white`}>
        {platform}
      </Badge>
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatCurrency = (num: number) => {
    return `₩${num.toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">캠페인 모니터링</h1>
          <p className="text-gray-500 mt-2">실시간 캠페인 성과를 추적하고 관리하세요</p>
        </div>
        <Button className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          새로고침
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              전체 캠페인
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{campaigns.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              진행중 {campaigns.filter(c => c.status === 'running').length}개
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              총 노출수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatNumber(campaigns.reduce((sum, c) => sum + c.impressions, 0))}
            </p>
            <p className="text-xs text-green-600 mt-1">+23% 증가</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MousePointer className="w-4 h-4" />
              평균 CTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(campaigns.reduce((sum, c) => sum + c.ctr, 0) / campaigns.length).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">업계 평균 2.5%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              총 전환수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatNumber(campaigns.reduce((sum, c) => sum + c.conversions, 0))}
            </p>
            <p className="text-xs text-green-600 mt-1">+15% 증가</p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="캠페인 이름으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="running">진행중</SelectItem>
                  <SelectItem value="paused">일시정지</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                </SelectContent>
              </Select>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="플랫폼 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 플랫폼</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="threads">Threads</SelectItem>
                  <SelectItem value="naver">Naver Blog</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 캠페인 리스트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <CardDescription className="mt-1">
                    담당자: {campaign.user} | {campaign.startDate} ~ {campaign.endDate}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getPlatformBadge(campaign.platform)}
                  {getStatusBadge(campaign.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 예산 진행률 */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>예산 소진율</span>
                  <span className="font-medium">
                    {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}
                  </span>
                </div>
                <Progress value={campaign.progress} className="h-2" />
              </div>

              {/* 성과 지표 */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{formatNumber(campaign.impressions)}</p>
                  <p className="text-xs text-gray-500">노출</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(campaign.clicks)}</p>
                  <p className="text-xs text-gray-500">클릭</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{campaign.ctr}%</p>
                  <p className="text-xs text-gray-500">CTR</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{campaign.conversions}</p>
                  <p className="text-xs text-gray-500">전환</p>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex justify-end gap-2 pt-2">
                {campaign.status === 'running' ? (
                  <Button variant="outline" size="sm">
                    <Pause className="w-4 h-4 mr-1" />
                    일시정지
                  </Button>
                ) : campaign.status === 'paused' ? (
                  <Button variant="outline" size="sm">
                    <Play className="w-4 h-4 mr-1" />
                    재개
                  </Button>
                ) : null}
                <Button variant="outline" size="sm">
                  상세보기
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}