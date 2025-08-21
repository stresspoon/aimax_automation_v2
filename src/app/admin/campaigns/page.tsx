'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  Target,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Campaign {
  id: string
  name: string
  description?: string
  platform: string
  status: string
  start_date?: string
  end_date?: string
  budget?: number
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  progress: number
  user?: {
    email: string
    full_name: string | null
  }
  created_at: string
  updated_at: string
}

interface CampaignStats {
  totalCampaigns: number
  activeCampaigns: number
  totalImpressions: number
  avgCTR: number
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCampaigns, setTotalCampaigns] = useState(0)
  const [stats, setStats] = useState<CampaignStats | null>(null)

  const limit = 10

  // 캠페인 목록 가져오기
  const fetchCampaigns = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true)
      else setIsLoading(true)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: searchQuery,
        status: statusFilter,
        platform: platformFilter,
        sortBy: 'created_at',
        sortOrder: 'desc'
      })

      const response = await fetch(`/api/admin/campaigns?${params}`)
      if (!response.ok) {
        throw new Error('캠페인 목록을 불러올 수 없습니다')
      }

      const data = await response.json()
      setCampaigns(data.campaigns)
      setTotalPages(data.pagination.totalPages)
      setTotalCampaigns(data.pagination.total)

      // 통계 계산
      const activeCount = data.campaigns.filter((c: Campaign) => c.status === 'active').length
      const totalImpressions = data.campaigns.reduce((sum: number, c: Campaign) => sum + c.impressions, 0)
      const avgCTR = data.campaigns.length > 0 
        ? data.campaigns.reduce((sum: number, c: Campaign) => sum + c.ctr, 0) / data.campaigns.length
        : 0
      
      setStats({
        totalCampaigns: data.pagination.total,
        activeCampaigns: activeCount,
        totalImpressions,
        avgCTR: parseFloat(avgCTR.toFixed(2))
      })

      if (showToast) {
        toast.success('캠페인 목록이 업데이트되었습니다')
      }
    } catch (error) {
      console.error('Campaigns fetch error:', error)
      toast.error('캠페인 목록 로딩 실패')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // 캠페인 상태 변경
  const updateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          status
        })
      })

      if (!response.ok) {
        throw new Error('캠페인 상태 변경 실패')
      }

      toast.success('캠페인 상태가 변경되었습니다')
      fetchCampaigns()
    } catch (error) {
      console.error('Update campaign error:', error)
      toast.error('캠페인 상태 변경 실패')
    }
  }

  // 캠페인 삭제
  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('정말로 이 캠페인을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/campaigns?campaignId=${campaignId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('캠페인 삭제 실패')
      }

      toast.success('캠페인이 삭제되었습니다')
      fetchCampaigns()
    } catch (error) {
      console.error('Delete campaign error:', error)
      toast.error('캠페인 삭제 실패')
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [currentPage, searchQuery, statusFilter, platformFilter])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      paused: "secondary",
      completed: "outline",
      failed: "destructive",
      draft: "secondary"
    }
    const labels: Record<string, string> = {
      active: "진행중",
      paused: "일시정지",
      completed: "완료",
      failed: "실패",
      draft: "초안"
    }
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getPlatformBadge = (platform: string) => {
    const colors: Record<string, string> = {
      instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
      threads: "bg-black",
      naver: "bg-green-600",
      facebook: "bg-blue-600"
    }
    return (
      <Badge className={`${colors[platform.toLowerCase()]} text-white`}>
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">캠페인 모니터링</h1>
          <p className="text-gray-500 mt-2">실시간 캠페인 성과를 추적하고 관리하세요</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchCampaigns(true)}
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
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            새 캠페인
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" />
                전체 캠페인
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
              <p className="text-xs text-gray-500 mt-1">
                진행중 {stats.activeCampaigns}개
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
                {formatNumber(stats.totalImpressions)}
              </p>
              <p className="text-xs text-green-600 mt-1">전체 캠페인</p>
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
                {stats.avgCTR}%
              </p>
              <p className="text-xs text-gray-500 mt-1">업계 평균 2.5%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                활성 캠페인
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {stats.activeCampaigns}
              </p>
              <p className="text-xs text-gray-500 mt-1">현재 진행중</p>
            </CardContent>
          </Card>
        </div>
      )}

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
                  <SelectItem value="">전체 상태</SelectItem>
                  <SelectItem value="active">진행중</SelectItem>
                  <SelectItem value="paused">일시정지</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="draft">초안</SelectItem>
                </SelectContent>
              </Select>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="플랫폼 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체 플랫폼</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="threads">Threads</SelectItem>
                  <SelectItem value="naver">Naver Blog</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 캠페인 리스트 */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500">캠페인이 없습니다</p>
            <Button className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              첫 캠페인 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <CardDescription className="mt-1">
                      담당자: {campaign.user?.full_name || campaign.user?.email || '알 수 없음'} | 
                      {campaign.start_date && campaign.end_date 
                        ? ` ${formatDate(campaign.start_date)} ~ ${formatDate(campaign.end_date)}`
                        : ' 기간 미정'}
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
                {campaign.budget && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>예산 소진율</span>
                      <span className="font-medium">
                        {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}
                      </span>
                    </div>
                    <Progress value={campaign.progress} className="h-2" />
                  </div>
                )}

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
                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    {campaign.status === 'active' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateCampaignStatus(campaign.id, 'paused')}
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        일시정지
                      </Button>
                    ) : campaign.status === 'paused' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateCampaignStatus(campaign.id, 'active')}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        재개
                      </Button>
                    ) : null}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>작업</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        상세보기
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        복제
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => deleteCampaign(campaign.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">
              {currentPage} / {totalPages} 페이지
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            다음
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}