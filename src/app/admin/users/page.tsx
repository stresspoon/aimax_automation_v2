'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Search, 
  Filter, 
  MoreHorizontal,
  UserPlus,
  Mail,
  Ban,
  Edit,
  Trash2,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  X
} from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  plan: string
  status: string
  created_at: string
  updated_at: string
  campaigns: number
  lastActive: string
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  proUsers: number
  suspendedUsers: number
}

export default function UsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [stats, setStats] = useState<UserStats | null>(null)
  
  // 필터 상태
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')

  const limit = 10

  // 사용자 목록 가져오기
  const fetchUsers = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true)
      else setIsLoading(true)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
        plan: planFilter,
        sortBy,
        sortOrder
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) {
        throw new Error('사용자 목록을 불러올 수 없습니다')
      }

      const data = await response.json()
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
      setTotalUsers(data.pagination.total)

      // 통계 계산
      const activeCount = data.users.filter((u: User) => u.status === 'active').length
      const proCount = data.users.filter((u: User) => u.plan === 'pro').length
      const suspendedCount = data.users.filter((u: User) => u.status === 'suspended').length
      
      setStats({
        totalUsers: data.pagination.total,
        activeUsers: activeCount,
        proUsers: proCount,
        suspendedUsers: suspendedCount
      })

      if (showToast) {
        toast({
          title: '성공',
          description: '사용자 목록이 업데이트되었습니다'
        })
      }
    } catch (error) {
      console.error('Users fetch error:', error)
      toast({
        title: '오류',
        description: '사용자 목록 로딩 실패',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // 사용자 상태 변경
  const updateUserStatus = async (userId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { status }
        })
      })

      if (!response.ok) {
        throw new Error('사용자 상태 변경 실패')
      }

      toast({
        title: '성공',
        description: '사용자 상태가 변경되었습니다'
      })
      fetchUsers()
    } catch (error) {
      console.error('Update user error:', error)
      toast({
        title: '오류',
        description: '사용자 상태 변경 실패',
        variant: 'destructive'
      })
    }
  }

  // 사용자 플랜 변경
  const updateUserPlan = async (userId: string, plan: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { plan }
        })
      })

      if (!response.ok) {
        throw new Error('플랜 변경 실패')
      }

      toast({
        title: '성공',
        description: '사용자 플랜이 변경되었습니다'
      })
      fetchUsers()
    } catch (error) {
      console.error('Update plan error:', error)
      toast({
        title: '오류',
        description: '플랜 변경 실패',
        variant: 'destructive'
      })
    }
  }

  // 사용자 삭제
  const deleteUser = async (userId: string) => {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('사용자 삭제 실패')
      }

      toast({
        title: '성공',
        description: '사용자가 삭제되었습니다'
      })
      fetchUsers()
    } catch (error) {
      console.error('Delete user error:', error)
      toast({
        title: '오류',
        description: '사용자 삭제 실패',
        variant: 'destructive'
      })
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchQuery, roleFilter, statusFilter, planFilter, sortBy, sortOrder])

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      suspended: "destructive"
    }
    const labels: Record<string, string> = {
      active: "활성",
      inactive: "비활성",
      suspended: "정지"
    }
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      basic: "secondary",
      pro: "default",
      enterprise: "outline"
    }
    return (
      <Badge variant={variants[plan] || "default"}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      user: "secondary",
      admin: "default",
      super_admin: "destructive"
    }
    const labels: Record<string, string> = {
      user: "사용자",
      admin: "관리자",
      super_admin: "최고관리자"
    }
    return (
      <Badge variant={variants[role] || "secondary"}>
        {labels[role] || role}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

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
          <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
          <p className="text-gray-500 mt-2">전체 {totalUsers}명의 사용자</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchUsers(true)}
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
          <Button className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            새 사용자 추가
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">전체 사용자</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">활성 사용자</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {stats.activeUsers}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pro 플랜</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {stats.proUsers}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">정지된 계정</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {stats.suspendedUsers}
              </p>
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
                  placeholder="이름 또는 이메일로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="역할" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  <SelectItem value="user">사용자</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                  <SelectItem value="super_admin">최고관리자</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                  <SelectItem value="suspended">정지</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="플랜" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                내보내기
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 사용자 테이블 */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input 
                    type="checkbox"
                    className="rounded"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={() => {
                      if (selectedUsers.length === users.length) {
                        setSelectedUsers([])
                      } else {
                        setSelectedUsers(users.map(u => u.id))
                      }
                    }}
                  />
                </TableHead>
                <TableHead>사용자</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>플랜</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>캠페인</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead>마지막 활동</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500">
                    사용자가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <input 
                        type="checkbox"
                        className="rounded"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src="" />
                          <AvatarFallback>
                            {(user.full_name || user.email).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || '이름 없음'}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getPlanBadge(user.plan)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{user.campaigns}</TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>{formatRelativeTime(user.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>작업</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            편집
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            이메일 보내기
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateUserStatus(
                              user.id, 
                              user.status === 'active' ? 'suspended' : 'active'
                            )}
                          >
                            {user.status === 'active' ? (
                              <>
                                <X className="mr-2 h-4 w-4" />
                                계정 정지
                              </>
                            ) : (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                계정 활성화
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => deleteUser(user.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                전체 {totalUsers}명 중 {(currentPage - 1) * limit + 1}-{Math.min(currentPage * limit, totalUsers)}명 표시
              </p>
              <div className="flex gap-2">
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
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}