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
import { createClient as createSbClient } from '@/lib/supabase/client'

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
      const res = await fetch(`/api/forms?projectId=${projectId}`)
      if (res.ok) {
        const forms = await res.json()
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
      }
    } catch (error) {
      console.error('Failed to load form:', error)
    }
  }
  
  const loadCandidates = async () => {
    if (!projectId) return
    
    try {
      const res = await fetch(`/api/forms/sync-candidates?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setCandidates(data.candidates || [])
      }
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
      alert('프로젝트를 먼저 저장해주세요')
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
      
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: formTitle || projectData.businessName || '고객 정보 수집',
          description: formDescription || '아래 정보를 입력해주세요',
          defaultFields: enabledDefaultFields,
          customFields: customFieldsObj
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
      
      const res = await fetch('/api/forms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          title: formTitle,
          description: formDescription,
          defaultFields: enabledDefaultFields,
          customFields: customFieldsObj
        })
      })
      
      if (!res.ok) throw new Error('업데이트 실패')
      
      alert('폼이 업데이트되었습니다')
      loadForm()
    } catch (error) {
      alert('업데이트에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  // 커스텀 필드 추가
  const addCustomField = () => {
    if (!newFieldLabel) {
      alert('필드 이름을 입력해주세요')
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
      const res = await fetch(`/api/forms/responses?formId=${form.id}&projectId=${projectId || ''}`)
      if (res.ok) {
        const data = await res.json()
        setResponses(data)
      }
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
      alert('다운로드할 데이터가 없습니다')
      return
    }
    // 필드 정의 수집: 기본 + 커스텀 (라벨/타입/순서)
    const defaultDefs = Object.entries(form?.fields?.default || {}).map(([key, def]: [string, any]) => ({
      key,
      label: def?.label || key,
      type: def?.type || 'text',
      order: def?.order ?? 999,
    }))
    const customDefs = Object.entries(form?.fields?.custom || {}).map(([key, def]: [string, any]) => ({
      key,
      label: def?.label || key,
      type: def?.type || 'text',
      order: def?.order ?? 999,
    }))
    const fieldDefs = [...defaultDefs, ...customDefs].sort((a, b) => (a.order - b.order))
    const labelByKey = fieldDefs.reduce<Record<string, string>>((m, f) => { m[f.key] = f.label; return m }, {})
    const typeByKey = fieldDefs.reduce<Record<string, string>>((m, f) => { m[f.key] = f.type; return m }, {})

    // 행 데이터 구성 (모든 응답 필드 + 팔로워/이웃 수치 포함)
    const excelData = responses.map((response) => {
      const row: Record<string, any> = {}

      // 1) 폼 정의 순서대로 모든 입력값 추가
      for (const def of fieldDefs) {
        const key = def.key
        const label = labelByKey[key] || key
        let value = response.data?.[key]

        // name/email/phone은 최상위 컬럼값 우선
        if (key === 'name') value = response.name ?? value
        if (key === 'email') value = response.email ?? value
        if (key === 'phone') value = response.phone ?? value

        // 체크박스/불린 가독성 변환
        if (typeByKey[key] === 'checkbox' && typeof value === 'boolean') {
          value = value ? '동의' : '미동의'
        }
        // 배열은 쉼표로 결합
        if (Array.isArray(value)) {
          value = value.join(', ')
        }
        // undefined/null 처리
        if (value === undefined || value === null) value = ''
        row[label] = value
      }

      // 2) 팔로워/이웃 수치 (기본 필드)
      const threadsUrl = response.data?.threadsUrl
      const instagramUrl = response.data?.instagramUrl
      const blogUrl = response.data?.blogUrl
      const threadsFollowers = response.sns_check_result?.threads?.followers
      const threadsErr = response.sns_check_result?.threads?.error
      const igFollowers = response.sns_check_result?.instagram?.followers
      const igErr = response.sns_check_result?.instagram?.error
      const blogNeighbors = response.sns_check_result?.blog?.neighbors
      const blogErr = response.sns_check_result?.blog?.error

      row['스레드 팔로워'] = !threadsUrl ? '입력누락' : (threadsErr || (threadsUrl && threadsFollowers === 0)) ? '입력오류' : (threadsFollowers || 0)
      row['인스타그램 팔로워'] = !instagramUrl ? '입력누락' : (igErr || (instagramUrl && igFollowers === 0)) ? '입력오류' : (igFollowers || 0)
      row['블로그 이웃'] = !blogUrl ? '입력누락' : (blogErr || (blogUrl && blogNeighbors === 0)) ? '입력오류' : (blogNeighbors || 0)

      // 3) 커스텀 SNS 필드(있다면) 팔로워/이웃 수치 추가
      const customSNS = response.sns_check_result?.custom || {}
      for (const [fieldKey, info] of Object.entries<any>(customSNS)) {
        const type = info?.type
        const followers = info?.followers
        const neighbors = info?.neighbors
        const lbl = labelByKey[fieldKey] || fieldKey
        if (type === 'blog') {
          row[`(${lbl}) 이웃`] = neighbors ?? 0
        } else {
          row[`(${lbl}) 팔로워`] = followers ?? 0
        }
      }

      // 4) 상태/메타 정보
      row['선정 여부'] = response.is_selected === true ? '선정' : response.is_selected === false ? '탈락' : '대기'
      row['처리 상태'] = response.status === 'completed' ? '완료' : response.status === 'processing' ? '처리중' : response.status === 'pending' ? '대기' : response.status || ''
      row['선정 사유'] = response.selection_reason || ''
      row['신청일시'] = new Date(response.created_at).toLocaleString('ko-KR')

      return row
    })

    // 워크시트 생성
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // 워크북 생성
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '지원자 목록')
    
    // 파일명 생성 (한글 인코딩을 위해 encodeURIComponent 사용)
    const fileName = `${formTitle || '지원자'}_${new Date().toISOString().split('T')[0]}.xlsx`
    
    // 다운로드
    XLSX.writeFile(wb, fileName)
  }
  
  // 링크 복사
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('링크가 복사되었습니다')
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
