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
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Project {
  id: string
  name: string
  description?: string
  type: string // platform -> type으로 변경
  status: string
  step: number // 현재 단계
  budget?: number
  candidates: number // 수집된 후보자 수
  selected: number // 선정된 후보자 수
  conversionRate: number // 전환율
  platform?: string // 실제 플랫폼 (naver, instagram 등)
  user?: {
    email: string
    name: string | null
  }
  created_at: string
  updated_at: string
  projectData?: any // 프로젝트 세부 데이터
}

interface ProjectStats {
  totalProjects: number
  activeProjects: number
  totalImpressions: number // 수집된 총 후보자 수
  avgCTR: number // 평균 전환율
}

export default function ProjectsPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProjects, setTotalProjects] = useState(0)
  const [stats, setStats] = useState<ProjectStats | null>(null)

  const limit = 10

  // 프로젝트 목록 가져오기
  const fetchProjects = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true)
      else setIsLoading(true)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: searchQuery,
        status: statusFilter === 'all' ? '' : statusFilter,
        platform: platformFilter === 'all' ? '' : platformFilter,
        sortBy: 'created_at',
        sortOrder: 'desc'
      })

      const response = await fetch(`/api/admin/projects?${params}`)
      if (!response.ok) {
        throw new Error('프로젝트 목록을 불러올 수 없습니다')
      }

      const data = await response.json()
      setProjects(data.projects)
      setTotalPages(data.pagination.totalPages)
      setTotalProjects(data.pagination.total)

      // 통계 계산
      const activeCount = data.projects.filter((p: Project) => p.status === 'active').length
      const totalCandidates = data.projects.reduce((sum: number, p: Project) => sum + (p.candidates || 0), 0)
      const totalSelected = data.projects.reduce((sum: number, p: Project) => sum + (p.selected || 0), 0)
      const avgConversionRate = totalCandidates > 0 
        ? (totalSelected / totalCandidates * 100)
        : 0
      
      setStats({
        totalProjects: data.pagination.total,
        activeProjects: activeCount,
        totalImpressions: totalCandidates, // 후보자 수로 대체
        avgCTR: parseFloat(avgConversionRate.toFixed(2)) // 전환율로 대체
      })

      if (showToast) {
        toast({
          title: '성공',
          description: '프로젝트 목록이 업데이트되었습니다'
        })
      }
    } catch (error) {
      console.error('Projects fetch error:', error)
      toast({
        title: '오류',
        description: '프로젝트 목록 로딩 실패',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // 프로젝트 상태 변경
  const updateProjectStatus = async (projectId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          status
        })
      })

      if (!response.ok) {
        throw new Error('프로젝트 상태 변경 실패')
      }

      toast({
        title: '성공',
        description: '프로젝트 상태가 변경되었습니다'
      })
      fetchProjects()
    } catch (error) {
      console.error('Update project error:', error)
      toast({
        title: '오류',
        description: '프로젝트 상태 변경 실패',
        variant: 'destructive'
      })
    }
  }

  // 프로젝트 삭제
  const deleteProject = async (projectId: string) => {
    if (!confirm('정말로 이 프로젝트을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/projects?projectId=${projectId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('프로젝트 삭제 실패')
      }

      toast({
        title: '성공',
        description: '프로젝트이 삭제되었습니다'
      })
      fetchProjects()
    } catch (error) {
      console.error('Delete project error:', error)
      toast({
        title: '오류',
        description: '프로젝트 삭제 실패',
        variant: 'destructive'
      })
    }
  }

  useEffect(() => {
    fetchProjects()
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
          <h1 className="text-3xl font-bold text-gray-900">프로젝트 모니터링</h1>
          <p className="text-gray-500 mt-2">실시간 프로젝트 성과를 추적하고 관리하세요</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchProjects(true)}
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
            새 프로젝트
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
                전체 프로젝트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalProjects}</p>
              <p className="text-xs text-gray-500 mt-1">
                진행중 {stats.activeProjects}개
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
              <p className="text-xs text-green-600 mt-1">전체 프로젝트</p>
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
                활성 프로젝트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {stats.activeProjects}
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
                  placeholder="프로젝트 이름으로 검색..."
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
                  <SelectItem value="all">전체 타입</SelectItem>
                  <SelectItem value="customer_acquisition">고객모집 자동화</SelectItem>
                  <SelectItem value="detail_page">상세페이지 생성</SelectItem>
                  <SelectItem value="video">영상 제작</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 프로젝트 리스트 */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500">프로젝트이 없습니다</p>
            <Button className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              첫 프로젝트 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      담당자: {project.user?.name || project.user?.email || '알 수 없음'} | 
                      {project.start_date && project.end_date 
                        ? ` ${formatDate(project.start_date)} ~ ${formatDate(project.end_date)}`
                        : ' 기간 미정'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPlatformBadge(project.platform)}
                    {getStatusBadge(project.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 예산 진행률 */}
                {project.budget && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>예산 소진율</span>
                      <span className="font-medium">
                        {formatCurrency(project.spent)} / {formatCurrency(project.budget)}
                      </span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                )}

                {/* 프로젝트 진행 상황 */}
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{project.step || 1}/3</p>
                    <p className="text-xs text-gray-500">단계</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{project.candidates || 0}</p>
                    <p className="text-xs text-gray-500">후보자</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{project.selected || 0}</p>
                    <p className="text-xs text-gray-500">선정</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{project.conversionRate || 0}%</p>
                    <p className="text-xs text-gray-500">전환율</p>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    {project.status === 'active' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateProjectStatus(project.id, 'paused')}
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        일시정지
                      </Button>
                    ) : project.status === 'paused' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateProjectStatus(project.id, 'active')}
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
                        onClick={() => deleteProject(project.id)}
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