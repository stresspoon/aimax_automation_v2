'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Copy, ExternalLink, Loader2, RefreshCw, 
  CheckCircle, XCircle, Clock, AlertCircle,
  QrCode, Users, FileSpreadsheet
} from 'lucide-react'
import QRCode from 'qrcode'

interface CustomFormTabProps {
  projectId: string | null
  projectData: any
  onUpdate: (data: any) => void
}

export default function CustomFormTab({ projectId, projectData, onUpdate }: CustomFormTabProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<any>(null)
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [responses, setResponses] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    selected: 0
  })
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  
  // 폼 정보 로드
  useEffect(() => {
    loadForm()
  }, [projectId])
  
  // 자동 새로고침 (5초마다)
  useEffect(() => {
    if (!form) return
    
    const interval = setInterval(() => {
      loadResponses(form.id)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [form])
  
  const loadForm = async () => {
    try {
      const res = await fetch(`/api/forms?projectId=${projectId}`)
      if (res.ok) {
        const forms = await res.json()
        if (forms.length > 0) {
          setForm(forms[0])
          setGoogleSheetUrl(forms[0].google_sheet_url || '')
          generateQRCode(forms[0].slug)
          loadResponses(forms[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load form:', error)
    }
  }
  
  // QR 코드 생성
  const generateQRCode = async (slug: string) => {
    try {
      const url = `${window.location.origin}/form/${slug}`
      const qr = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2
      })
      setQrCodeUrl(qr)
    } catch (error) {
      console.error('QR generation failed:', error)
    }
  }
  
  // 응답 로드
  const loadResponses = async (formId: string) => {
    try {
      const res = await fetch(`/api/forms/responses?formId=${formId}`)
      if (res.ok) {
        const data = await res.json()
        setResponses(data)
        
        // 통계 계산
        const stats = {
          total: data.length,
          pending: data.filter((r: any) => r.status === 'pending').length,
          completed: data.filter((r: any) => r.status === 'completed').length,
          selected: data.filter((r: any) => r.is_selected).length
        }
        setStats(stats)
      }
    } catch (error) {
      console.error('Failed to load responses:', error)
    }
  }
  
  // 폼 생성 또는 업데이트
  const handleCreateForm = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: projectData.businessName || '고객 정보 수집',
          googleSheetUrl
        })
      })
      
      if (!res.ok) throw new Error('폼 생성 실패')
      
      const data = await res.json()
      setForm(data.form)
      generateQRCode(data.form.slug)
      
      // 프로젝트 데이터 업데이트
      onUpdate({
        ...projectData,
        formId: data.form.id,
        formUrl: data.formUrl
      })
      
      alert('폼이 생성되었습니다!')
    } catch (error) {
      alert('폼 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  // Google Sheets URL 업데이트
  const handleUpdateSheetUrl = async () => {
    if (!form) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/forms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          google_sheet_url: googleSheetUrl,
          google_sheet_id: googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1]
        })
      })
      
      if (!res.ok) throw new Error('업데이트 실패')
      
      alert('Google Sheets 연결이 업데이트되었습니다')
    } catch (error) {
      alert('업데이트에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  // 링크 복사
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('링크가 복사되었습니다')
  }
  
  // 상태 배지 컴포넌트
  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      pending: { label: '대기중', icon: Clock, variant: 'secondary' as const },
      processing: { label: '처리중', icon: Loader2, variant: 'default' as const },
      completed: { label: '완료', icon: CheckCircle, variant: 'default' as const },
      archived: { label: '보관됨', icon: CheckCircle, variant: 'outline' as const },
      error: { label: '오류', icon: XCircle, variant: 'destructive' as const }
    }
    
    const { label, icon: Icon, variant } = config[status as keyof typeof config] || config.pending
    
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* 폼 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>자체 폼 시스템</CardTitle>
          <CardDescription>
            고객 정보를 수집할 폼을 생성하고 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!form ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  폼을 생성하면 고객이 직접 신청할 수 있는 링크가 생성됩니다.
                  Google Sheets를 연결하면 자동으로 데이터가 저장됩니다.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label>Google Sheets URL (선택사항)</Label>
                <Input
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  * Google Sheets를 먼저 생성하고 "링크가 있는 모든 사용자가 편집 가능"으로 설정해주세요
                </p>
              </div>
              
              <Button onClick={handleCreateForm} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  '폼 생성하기'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 폼 URL */}
              <div className="space-y-2">
                <Label>폼 URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/form/${form.slug}`}
                    readOnly
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(`${window.location.origin}/form/${form.slug}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => window.open(`/form/${form.slug}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* QR 코드 */}
              {qrCodeUrl && (
                <div className="space-y-2">
                  <Label>QR 코드</Label>
                  <div className="p-4 bg-white rounded-lg border inline-block">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}
              
              {/* Google Sheets 연결 */}
              <div className="space-y-2">
                <Label>Google Sheets URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  />
                  <Button onClick={handleUpdateSheetUrl} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      '업데이트'
                    )}
                  </Button>
                </div>
                {form.google_sheet_url && (
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => window.open(form.google_sheet_url, '_blank')}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Google Sheets 열기
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 응답 통계 */}
      {form && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>응답 현황</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadResponses(form.id)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-500">전체 응답</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-500">대기중</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                <div className="text-sm text-gray-500">처리완료</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.selected}</div>
                <div className="text-sm text-gray-500">선정</div>
              </div>
            </div>
            
            {/* 최근 응답 목록 */}
            <div className="space-y-2">
              <h4 className="font-medium">최근 응답 (최대 10개)</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm">이름</th>
                      <th className="px-4 py-2 text-left text-sm">이메일</th>
                      <th className="px-4 py-2 text-left text-sm">상태</th>
                      <th className="px-4 py-2 text-left text-sm">선정여부</th>
                      <th className="px-4 py-2 text-left text-sm">제출시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.slice(0, 10).map((response) => (
                      <tr key={response.id} className="border-t">
                        <td className="px-4 py-2 text-sm">{response.name}</td>
                        <td className="px-4 py-2 text-sm">{response.email}</td>
                        <td className="px-4 py-2">
                          <StatusBadge status={response.status} />
                        </td>
                        <td className="px-4 py-2">
                          {response.is_selected !== null && (
                            response.is_selected ? (
                              <Badge variant="default" className="bg-green-500 hover:bg-green-600">선정</Badge>
                            ) : (
                              <Badge variant="secondary">탈락</Badge>
                            )
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {new Date(response.created_at).toLocaleString('ko-KR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {responses.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    아직 응답이 없습니다
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}