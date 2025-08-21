'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Download, RefreshCw, User, Calendar, Activity } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ActivityLog {
  id: string
  user_id: string
  action: string
  details: any
  ip_address?: string
  user_agent?: string
  created_at: string
  user_profiles?: {
    email: string
    role: string
  }
}

const actionTypeColors: Record<string, string> = {
  'user.create': 'bg-green-100 text-green-800',
  'user.update': 'bg-blue-100 text-blue-800',
  'user.delete': 'bg-red-100 text-red-800',
  'user.status_change': 'bg-yellow-100 text-yellow-800',
  'user.role_change': 'bg-purple-100 text-purple-800',
  'campaign.create': 'bg-green-100 text-green-800',
  'campaign.update': 'bg-blue-100 text-blue-800',
  'campaign.delete': 'bg-red-100 text-red-800',
  'campaign.status_change': 'bg-yellow-100 text-yellow-800',
  'auth.login': 'bg-indigo-100 text-indigo-800',
  'auth.logout': 'bg-gray-100 text-gray-800',
  'auth.failed': 'bg-red-100 text-red-800',
  'settings.update': 'bg-orange-100 text-orange-800',
  'api.call': 'bg-cyan-100 text-cyan-800'
}

const actionTypeLabels: Record<string, string> = {
  'user.create': '사용자 생성',
  'user.update': '사용자 수정',
  'user.delete': '사용자 삭제',
  'user.status_change': '사용자 상태 변경',
  'user.role_change': '사용자 권한 변경',
  'campaign.create': '캠페인 생성',
  'campaign.update': '캠페인 수정',
  'campaign.delete': '캠페인 삭제',
  'campaign.status_change': '캠페인 상태 변경',
  'auth.login': '로그인',
  'auth.logout': '로그아웃',
  'auth.failed': '로그인 실패',
  'settings.update': '설정 변경',
  'api.call': 'API 호출'
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const limit = 50
  const { toast } = useToast()

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      })

      if (actionFilter !== 'all') {
        params.append('action', actionFilter)
      }

      if (dateFilter !== 'all') {
        const now = new Date()
        let startDate = new Date()
        
        switch (dateFilter) {
          case 'today':
            startDate.setHours(0, 0, 0, 0)
            break
          case 'week':
            startDate.setDate(now.getDate() - 7)
            break
          case 'month':
            startDate.setMonth(now.getMonth() - 1)
            break
        }
        
        params.append('startDate', startDate.toISOString())
        params.append('endDate', now.toISOString())
      }

      const response = await fetch(`/api/admin/activity-logs?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }

      const data = await response.json()
      setLogs(data.logs)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching logs:', error)
      toast({
        title: '오류',
        description: '활동 로그를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [actionFilter, dateFilter, offset])

  const formatDetails = (details: any) => {
    if (!details) return '-'
    
    const important = []
    if (details.campaign_name) important.push(`캠페인: ${details.campaign_name}`)
    if (details.deleted_user_email) important.push(`삭제된 사용자: ${details.deleted_user_email}`)
    if (details.old_status && details.new_status) {
      important.push(`${details.old_status} → ${details.new_status}`)
    }
    if (details.old_role && details.new_role) {
      important.push(`${details.old_role} → ${details.new_role}`)
    }
    
    return important.length > 0 ? important.join(', ') : JSON.stringify(details)
  }

  const exportLogs = () => {
    const csv = [
      ['시간', '사용자', '액션', '상세', 'IP 주소'].join(','),
      ...logs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user_profiles?.email || log.user_id,
        actionTypeLabels[log.action] || log.action,
        formatDetails(log.details),
        log.ip_address || '-'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">활동 로그</h1>
          <p className="text-gray-500 mt-1">시스템 내 모든 활동을 모니터링합니다</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportLogs}
            disabled={logs.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>활동 기록</CardTitle>
              <CardDescription>총 {total}개의 활동 로그</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <Activity className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="액션 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 액션</SelectItem>
                  <SelectItem value="user.create">사용자 생성</SelectItem>
                  <SelectItem value="user.update">사용자 수정</SelectItem>
                  <SelectItem value="user.delete">사용자 삭제</SelectItem>
                  <SelectItem value="campaign.create">캠페인 생성</SelectItem>
                  <SelectItem value="campaign.update">캠페인 수정</SelectItem>
                  <SelectItem value="campaign.delete">캠페인 삭제</SelectItem>
                  <SelectItem value="auth.login">로그인</SelectItem>
                  <SelectItem value="auth.logout">로그아웃</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[150px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="기간 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 기간</SelectItem>
                  <SelectItem value="today">오늘</SelectItem>
                  <SelectItem value="week">최근 7일</SelectItem>
                  <SelectItem value="month">최근 30일</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-500">로딩 중...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              활동 로그가 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시간</TableHead>
                    <TableHead>사용자</TableHead>
                    <TableHead>액션</TableHead>
                    <TableHead>상세</TableHead>
                    <TableHead>IP 주소</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), 'MM/dd HH:mm:ss', { locale: ko })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {log.user_profiles?.email || log.user_id.slice(0, 8)}
                          </span>
                          {log.user_profiles?.role === 'admin' && (
                            <Badge variant="secondary" className="text-xs">관리자</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={actionTypeColors[log.action] || 'bg-gray-100 text-gray-800'}
                        >
                          {actionTypeLabels[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <span className="text-sm text-gray-600 truncate block">
                          {formatDetails(log.details)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {log.ip_address || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {total > limit && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
              >
                이전
              </Button>
              <span className="py-2 px-4 text-sm text-gray-600">
                {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}