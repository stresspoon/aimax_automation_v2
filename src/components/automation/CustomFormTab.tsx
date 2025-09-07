'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Copy, ExternalLink, Loader2, AlertCircle,
  Download, Plus, X, Edit2
} from 'lucide-react'
import QRCode from 'qrcode'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { createClient as createSbClient } from '@/lib/supabase/client'
import { fetchJSON } from '@/lib/httpClient'
import { errorMessage } from '@/lib/errors'

interface CustomFormTabProps {
  projectId: string | null
  projectData: any
  onUpdate: (data: any) => void
}

interface FormField {
  name: string
  label: string
  type: string
  required: boolean
  order: number
  enabled?: boolean
}

export default function CustomFormTab({ projectId, projectData, onUpdate }: CustomFormTabProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<any>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [customFields, setCustomFields] = useState<FormField[]>([])
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState('text')
  const [candidates, setCandidates] = useState<any[]>([])
  const [responses, setResponses] = useState<any[]>([])
  const [loadingResponses, setLoadingResponses] = useState(false)
  
  // 기본 필드 설정 (활성화 여부 포함)
  const [defaultFields, setDefaultFields] = useState<FormField[]>([
    { name: 'name', label: '성함', type: 'text', required: true, order: 1, enabled: true },
    { name: 'phone', label: '연락처', type: 'tel', required: true, order: 2, enabled: true },
    { name: 'email', label: '메일주소', type: 'email', required: true, order: 3, enabled: true },
    { name: 'source', label: '어디에서 신청주셨나요?', type: 'text', required: false, order: 4, enabled: true },
    { name: 'threadsUrl', label: '후기 작성할 스레드 URL', type: 'url', required: false, order: 5, enabled: true },
    { name: 'instagramUrl', label: '후기 작성할 인스타그램 URL', type: 'url', required: false, order: 6, enabled: true },
    { name: 'blogUrl', label: '후기 작성할 블로그 URL', type: 'url', required: false, order: 7, enabled: true },
    { name: 'privacyConsent', label: '개인정보 활용 동의', type: 'checkbox', required: true, order: 8, enabled: true }
  ])
  
  // 폼 정보 로드
  useEffect(() => {
    if (projectId) {
      loadForm()
      loadCandidates()
    }
  }, [projectId])
  
  // 2초마다 후보 데이터 새로고침
  useEffect(() => {
    if (form) {
      const interval = setInterval(loadCandidates, 2000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [form])
  
  const loadForm = async () => {
    if (!projectId) {
      console.log('No projectId provided')
      return
    }
    
    try {
      console.log('Loading form for projectId:', projectId)
      const forms = await fetchJSON<any[]>(`/api/forms?projectId=${projectId}`)
      console.log('Forms loaded:', forms)
      if (forms.length > 0) {
        const formData = forms[0]
        setForm(formData)
        setFormTitle(formData.title || '')
        setFormDescription(formData.description || '')
        generateQRCode(formData.slug)
        
        // 커스텀 필드 로드
        if (formData.fields && formData.fields.custom) {
          const customFieldsArray = Object.entries(formData.fields.custom).map(([key, field]: [string, any]) => ({
            name: key,
            label: field.label,
            type: field.type,
            required: field.required,
            order: field.order
          }))
          setCustomFields(customFieldsArray)
        }
      }
    } catch (error) {
      console.error('Failed to load form:', error)
    }
  }
  
  const loadCandidates = async () => {
    if (!projectId) return
    
    try {
      const data = await fetchJSON<{ candidates: any[] }>(`/api/forms/sync-candidates?projectId=${projectId}`)
      setCandidates(data.candidates || [])
    } catch (error) {
      console.error('Failed to load candidates:', error)
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
  
  // 폼 생성
  const handleCreateForm = async () => {
    if (!projectId) {
      toast.error('프로젝트를 먼저 저장해주세요')
      return
    }
    
    setLoading(true)
    try {
      // 활성화된 기본 필드만 포함
      const enabledDefaultFields = defaultFields
        .filter(field => field.enabled)
        .reduce((acc, field) => {
          acc[field.name] = {
            label: field.label,
            type: field.type,
            required: field.required,
            order: field.order
          }
          return acc
        }, {} as any)
      
      // 커스텀 필드 추가
      const customFieldsObj = customFields.reduce((acc, field, index) => {
        acc[field.name] = {
          label: field.label,
          type: field.type,
          required: field.required,
          order: 9 + index // 기본 필드 다음 순서
        }
        return acc
      }, {} as any)
      
      const data = await fetchJSON<any>('/api/forms', {
        method: 'POST',
        body: {
          projectId,
          title: formTitle || projectData.businessName || '고객 정보 수집',
          description: formDescription || '아래 정보를 입력해주세요',
          defaultFields: enabledDefaultFields,
          customFields: customFieldsObj
        }
      })
      setForm(data.form)
      generateQRCode(data.form.slug)
      
      // 프로젝트 데이터 업데이트
      onUpdate({
        ...projectData,
        formId: data.form.id,
        formUrl: data.formUrl
      })
      
      toast.success('폼이 생성되었습니다!')
    } catch (error) {
      toast.error(errorMessage(error, '폼 생성에 실패했습니다'))
    } finally {
      setLoading(false)
    }
  }
  
  // 폼 업데이트
  const handleUpdateForm = async () => {
    if (!form) return
    
    setLoading(true)
    try {
      // 활성화된 기본 필드만 포함
      const enabledDefaultFields = defaultFields
        .filter(field => field.enabled)
        .reduce((acc, field) => {
          acc[field.name] = {
            label: field.label,
            type: field.type,
            required: field.required,
            order: field.order
          }
          return acc
        }, {} as any)
      
      const customFieldsObj = customFields.reduce((acc, field, index) => {
        acc[field.name] = {
          label: field.label,
          type: field.type,
          required: field.required,
          order: 9 + index
        }
        return acc
      }, {} as any)
      
      await fetchJSON('/api/forms', {
        method: 'PATCH',
        body: {
          id: form.id,
          title: formTitle,
          description: formDescription,
          defaultFields: enabledDefaultFields,
          customFields: customFieldsObj
        }
      })
      toast.success('폼이 업데이트되었습니다')
      loadForm()
    } catch (error) {
      toast.error(errorMessage(error, '업데이트에 실패했습니다'))
    } finally {
      setLoading(false)
    }
  }
  
  // 커스텀 필드 추가
  const addCustomField = () => {
    if (!newFieldLabel) {
      toast.error('필드 이름을 입력해주세요')
      return
    }
    
    const fieldName = `custom_${Date.now()}`
    const newField: FormField = {
      name: fieldName,
      label: newFieldLabel,
      type: newFieldType,
      required: false,
      order: 9 + customFields.length
    }
    
    setCustomFields([...customFields, newField])
    setNewFieldLabel('')
    setNewFieldType('text')
  }
  
  // 커스텀 필드 제거
  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }
  
  // 응답 데이터 가져오기
  const fetchResponses = async () => {
    if (!form?.id) return
    
    setLoadingResponses(true)
    try {
      const data = await fetchJSON<any[]>(`/api/forms/responses?formId=${form.id}&projectId=${projectId || ''}`)
      setResponses(data)
    } catch (error) {
      console.error('응답 데이터 조회 실패:', error)
    } finally {
      setLoadingResponses(false)
    }
  }
  
  // 폼이 로드되면 응답 데이터도 가져오기
  useEffect(() => {
    if (form?.id) {
      fetchResponses()
      // 짧은 기간 폴링(상태 완료 시점 반영)
      const start = Date.now()
      const timer = setInterval(() => {
        if (Date.now() - start > 30000) { // 30초 제한
          clearInterval(timer)
          return
        }
        fetchResponses()
      }, 2000)
      return () => clearInterval(timer)
    }
    return undefined
  }, [form?.id])

  // Realtime: 프로젝트 범위 응답 변경 감지 후 즉시 갱신
  useEffect(() => {
    if (!projectId) return undefined
    const supabase = createSbClient()
    const channel = supabase
      .channel(`responses-project-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'form_responses_temp',
        filter: `project_id=eq.${projectId}`,
      }, () => {
        fetchResponses()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, form?.id])
  
  // 엑셀 다운로드
  const downloadExcel = () => {
    if (responses.length === 0) {
      toast.error('다운로드할 데이터가 없습니다')
      return
    }
    
    // 모든 응답에서 나타나는 모든 필드 키 수집
    const allFieldKeys = new Set<string>()
    responses.forEach(response => {
      if (response.data) {
        Object.keys(response.data).forEach(key => allFieldKeys.add(key))
      }
    })
    
    // 필드 순서 정의 (우선순위가 높은 필드부터)
    const priorityFields = ['name', 'email', 'phone', 'threadsUrl', 'instagramUrl', 'blogUrl', 'source']
    const otherFields = Array.from(allFieldKeys).filter(key => !priorityFields.includes(key))
    const orderedFields = [...priorityFields, ...otherFields]
    
    // 헤더명 매핑
    const headerMap: Record<string, string> = {
      'name': '이름',
      'email': '이메일',
      'phone': '연락처',
      'threadsUrl': '스레드URL',
      'instagramUrl': '인스타URL',
      'blogUrl': '블로그URL',
      'source': '신청경로'
    }
    
    // 엑셀 데이터 생성
    const excelData = responses.map(response => {
      const row: Record<string, any> = {}
      
      // 1. 폼에서 입력한 모든 데이터 추가
      orderedFields.forEach(key => {
        const header = headerMap[key] || key
        let value = response.data?.[key]
        
        // 최상위 필드 우선 사용
        if (key === 'name' && response.name) value = response.name
        if (key === 'email' && response.email) value = response.email
        if (key === 'phone' && response.phone) value = response.phone
        
        // 값 포맷팅
        if (value === undefined || value === null) {
          value = ''
        } else if (typeof value === 'boolean') {
          value = value ? '예' : '아니오'
        } else if (Array.isArray(value)) {
          value = value.join(', ')
        } else if (typeof value === 'object') {
          value = JSON.stringify(value)
        }
        
        row[header] = value
      })
      
      // 2. SNS 팔로워/이웃 수 추가
      const threadsFollowers = response.sns_check_result?.threads?.followers
      const instagramFollowers = response.sns_check_result?.instagram?.followers
      const blogNeighbors = response.sns_check_result?.blog?.neighbors
      
      // URL 존재 여부 확인
      const hasThreadsUrl = response.data?.threadsUrl && response.data.threadsUrl.trim() !== ''
      const hasInstagramUrl = response.data?.instagramUrl && response.data.instagramUrl.trim() !== ''
      const hasBlogUrl = response.data?.blogUrl && response.data.blogUrl.trim() !== ''
      
      // 팔로워 수 표시 (URL이 없으면 '-', 있는데 0이면 '체크실패' 또는 실제 숫자)
      row['Threads팔로워'] = !hasThreadsUrl ? '-' : 
                            (threadsFollowers === undefined || threadsFollowers === null) ? '체크대기' :
                            threadsFollowers === 0 ? '체크실패' : threadsFollowers
                            
      row['인스타팔로워'] = !hasInstagramUrl ? '-' : 
                          (instagramFollowers === undefined || instagramFollowers === null) ? '체크대기' :
                          instagramFollowers === 0 ? '체크실패' : instagramFollowers
                          
      row['블로그이웃'] = !hasBlogUrl ? '-' : 
                        (blogNeighbors === undefined || blogNeighbors === null) ? '체크대기' :
                        blogNeighbors === 0 ? '체크실패' : blogNeighbors
      
      // 3. 선정 상태 및 메타 정보
      row['선정상태'] = response.is_selected === true ? '선정' : 
                      response.is_selected === false ? '탈락' : '미정'
      row['처리상태'] = response.status === 'completed' ? '완료' :
                      response.status === 'processing' ? '처리중' :
                      response.status === 'pending' ? '대기' : response.status || ''
      row['선정사유'] = response.selection_reason || ''
      row['신청일시'] = new Date(response.created_at).toLocaleString('ko-KR')
      
      return row
    })
    
    // 워크시트 생성
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // 컬럼 너비 자동 조정
    const maxWidth = 30
    const cols = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(10, key.length + 2))
    }))
    ws['!cols'] = cols
    
    // 워크북 생성
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '지원자목록')
    
    // 파일명 생성
    const fileName = `${formTitle || '지원자'}_${new Date().toISOString().split('T')[0]}.xlsx`
    
    // 다운로드
    XLSX.writeFile(wb, fileName)
  }
  
  // 링크 복사
  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('링크가 복사되었습니다'))
      .catch(() => toast.error('복사에 실패했습니다'))
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
                </AlertDescription>
              </Alert>
              
              {/* 폼 제목과 설명 */}
              <div className="space-y-2">
                <Label>폼 제목</Label>
                <Input
                  placeholder="예: 인플루언서 모집"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>폼 설명</Label>
                <Textarea
                  placeholder="폼 상단에 표시될 설명을 입력하세요"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
              
              {/* 기본 필드 선택 */}
              <div className="space-y-2">
                <Label>기본 필드 설정</Label>
                <div className="space-y-2 p-4 border rounded">
                  {defaultFields.map((field, index) => (
                    <div key={field.name} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`field-${field.name}`}
                        checked={field.enabled}
                        onChange={(e) => {
                          const newFields = [...defaultFields]
                          newFields[index].enabled = e.target.checked
                          setDefaultFields(newFields)
                        }}
                        className="w-4 h-4"
                      />
                      <label htmlFor={`field-${field.name}`} className="flex-1 cursor-pointer">
                        <span className="font-medium">{field.label}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({field.type}){field.required && ' *필수'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 커스텀 필드 추가 */}
              <div className="space-y-2">
                <Label>추가 필드</Label>
                <div className="space-y-2">
                  {customFields.map((field, index) => (
                    <div key={field.name} className="flex items-center gap-2 p-2 border rounded">
                      <span className="flex-1">{field.label} ({field.type})</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeCustomField(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="필드 이름"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                    />
                    <select
                      className="px-3 py-2 border rounded"
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value)}
                    >
                      <option value="text">텍스트</option>
                      <option value="tel">전화번호</option>
                      <option value="email">이메일</option>
                      <option value="url">URL</option>
                      <option value="textarea">긴 텍스트</option>
                      <option value="select">선택</option>
                    </select>
                    <Button onClick={addCustomField} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
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
              
              {/* 응답 데이터 섹션 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>응답 데이터 ({responses.length}개)</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchResponses}
                      disabled={loadingResponses}
                    >
                      {loadingResponses ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        '새로고침'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={downloadExcel}
                      disabled={responses.length === 0}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      엑셀 다운로드
                    </Button>
                  </div>
                </div>
                {responses.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      총 {responses.length}명이 신청했습니다.
                      선정: {responses.filter(r => r.is_selected === true).length}명,
                      탈락: {responses.filter(r => r.is_selected === false).length}명,
                      대기: {responses.filter(r => r.is_selected === null).length}명
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              {/* 폼 수정 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>폼 설정</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const editMode = !form.editMode
                      setForm({ ...form, editMode })
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {form.editMode && (
                  <div className="space-y-2 p-4 border rounded">
                    <Input
                      placeholder="폼 제목"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                    />
                    <Textarea
                      placeholder="폼 설명"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={handleUpdateForm} disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        '업데이트'
                      )}
                    </Button>
                  </div>
                )}
              </div>
              
              {/* 엑셀 다운로드 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>수집된 데이터</Label>
                  <Badge>{candidates.length}명</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!form?.id) return
                      try {
                        await fetch(`/api/forms/process`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ responseId: null })
                        })
                      } catch {}
                      fetchResponses()
                    }}
                  >
                    재검사
                  </Button>
                  <Button onClick={downloadExcel} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    엑셀 다운로드
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Google Sheets 연동 준비 (나중에 활성화 가능) */}
      {/* 
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle>Google Sheets 연동 (준비 중)</CardTitle>
          <CardDescription>
            추후 Google Sheets 자동 연동 기능이 추가될 예정입니다
          </CardDescription>
        </CardHeader>
      </Card>
      */}
    </div>
  )
}
