'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, Plus, X, Loader2, Copy, ExternalLink, 
  AlertCircle, Download
} from 'lucide-react'
import QRCode from 'qrcode'
import * as XLSX from 'xlsx'

interface FormField {
  name: string
  label: string
  type: 'text' | 'tel' | 'email' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio'
  required: boolean
  order: number
  enabled?: boolean
  options?: string[] // 선택 필드용 옵션들
  placeholder?: string // 필드별 플레이스홀더
  validation?: {
    pattern?: string
    message?: string
  }
}

function FormBuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<any>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  
  // 기본 필드 설정
  const [defaultFields, setDefaultFields] = useState<FormField[]>([
    { name: 'name', label: '성함', type: 'text', required: true, order: 1, enabled: true },
    { name: 'phone', label: '연락처', type: 'tel', required: true, order: 2, enabled: true },
    { name: 'email', label: '메일주소', type: 'email', required: true, order: 3, enabled: true },
    { name: 'source', label: '어디에서 신청주셨나요?', type: 'text', required: false, order: 4, enabled: false },
    { name: 'threadsUrl', label: '후기 작성할 스레드 URL', type: 'url', required: false, order: 5, enabled: true },
    { name: 'instagramUrl', label: '후기 작성할 인스타그램 URL', type: 'url', required: false, order: 6, enabled: true },
    { name: 'blogUrl', label: '후기 작성할 블로그 URL', type: 'url', required: false, order: 7, enabled: true },
    { name: 'privacyConsent', label: '개인정보 활용 동의', type: 'checkbox', required: true, order: 8, enabled: true }
  ])
  
  // 커스텀 필드
  const [customFields, setCustomFields] = useState<FormField[]>([])
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<FormField['type']>('text')
  const [newFieldRequired, setNewFieldRequired] = useState(false)
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('')
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>(['옵션 1'])
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null)
  
  // 기존 폼 로드
  useEffect(() => {
    if (projectId) {
      loadExistingForm()
    }
  }, [projectId])
  
  const loadExistingForm = async () => {
    try {
      const res = await fetch(`/api/forms?projectId=${projectId}`)
      if (res.ok) {
        const forms = await res.json()
        if (forms && forms.length > 0) {
          const existingForm = forms[0]
          setForm(existingForm)
          setFormTitle(existingForm.title || '')
          setFormDescription(existingForm.description || '')
          generateQRCode(existingForm.slug)
          
          // 기존 필드 설정 로드
          if (existingForm.fields) {
            // 기본 필드 업데이트
            if (existingForm.fields.default) {
              setDefaultFields(prev => prev.map(field => ({
                ...field,
                enabled: existingForm.fields.default[field.name] !== undefined
              })))
            }
            
            // 커스텀 필드 로드
            if (existingForm.fields.custom) {
              const customFieldsArray = Object.entries(existingForm.fields.custom).map(([name, field]: [string, any]) => ({
                name,
                label: field.label,
                type: field.type,
                required: field.required,
                order: field.order
              }))
              setCustomFields(customFieldsArray)
            }
          }
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
  
  // 폼 생성
  const handleCreateForm = async () => {
    if (!projectId) {
      alert('프로젝트 ID가 필요합니다')
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
          order: 9 + index,
          placeholder: field.placeholder,
          options: field.options,
          validation: field.validation
        }
        return acc
      }, {} as any)
      
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: formTitle || '고객 정보 수집',
          description: formDescription || '아래 정보를 입력해주세요',
          defaultFields: enabledDefaultFields,
          customFields: customFieldsObj
        })
      })
      
      if (!res.ok) throw new Error('폼 생성 실패')
      
      const data = await res.json()
      setForm(data.form)
      generateQRCode(data.form.slug)
      
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
          order: 9 + index,
          placeholder: field.placeholder,
          options: field.options,
          validation: field.validation
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
      
      if (!res.ok) {
        const error = await res.json()
        console.error('Form update error:', error)
        throw new Error(error.error || '업데이트 실패')
      }
      
      const updatedForm = await res.json()
      console.log('Form updated successfully:', updatedForm)
      
      alert('폼이 업데이트되었습니다')
      // 즉시 업데이트된 폼을 반영
      setForm(updatedForm)
      // 필요시 재로드
      await loadExistingForm()
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
    
    // 선택 필드인 경우 옵션이 최소 1개는 있어야 함
    if ((newFieldType === 'select' || newFieldType === 'radio') && newFieldOptions.length === 0) {
      alert('선택 옵션을 최소 1개 이상 추가해주세요')
      return
    }
    
    const fieldName = `custom_${Date.now()}`
    const newField: FormField = {
      name: fieldName,
      label: newFieldLabel,
      type: newFieldType,
      required: newFieldRequired,
      order: 9 + customFields.length,
      placeholder: newFieldPlaceholder || undefined,
      options: (newFieldType === 'select' || newFieldType === 'radio') ? newFieldOptions : undefined
    }
    
    // 필드 타입별 기본 검증 패턴 추가
    if (newFieldType === 'email') {
      newField.validation = {
        pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
        message: '올바른 이메일 형식을 입력해주세요'
      }
    } else if (newFieldType === 'tel') {
      newField.validation = {
        pattern: '^[0-9-]+$',
        message: '올바른 전화번호 형식을 입력해주세요'
      }
    } else if (newFieldType === 'url') {
      newField.validation = {
        pattern: '^https?://.+',
        message: 'http:// 또는 https://로 시작하는 URL을 입력해주세요'
      }
    }
    
    if (editingFieldIndex !== null) {
      // 수정 모드
      const updatedFields = [...customFields]
      updatedFields[editingFieldIndex] = newField
      setCustomFields(updatedFields)
      setEditingFieldIndex(null)
    } else {
      // 추가 모드
      setCustomFields([...customFields, newField])
    }
    
    // 폼 초기화
    setNewFieldLabel('')
    setNewFieldType('text')
    setNewFieldRequired(false)
    setNewFieldPlaceholder('')
    setNewFieldOptions(['옵션 1'])
  }
  
  // 옵션 추가/제거 함수
  const addOption = () => {
    setNewFieldOptions([...newFieldOptions, `옵션 ${newFieldOptions.length + 1}`])
  }
  
  const removeOption = (index: number) => {
    if (newFieldOptions.length > 1) {
      setNewFieldOptions(newFieldOptions.filter((_, i) => i !== index))
    }
  }
  
  const updateOption = (index: number, value: string) => {
    const updated = [...newFieldOptions]
    updated[index] = value
    setNewFieldOptions(updated)
  }
  
  // 필드 수정
  const editCustomField = (index: number) => {
    const field = customFields[index]
    setNewFieldLabel(field.label)
    setNewFieldType(field.type)
    setNewFieldRequired(field.required)
    setNewFieldPlaceholder(field.placeholder || '')
    setNewFieldOptions(field.options || ['옵션 1'])
    setEditingFieldIndex(index)
  }
  
  // 커스텀 필드 제거
  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }
  
  // 링크 복사
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('링크가 복사되었습니다')
  }
  
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="ml-4 text-xl font-semibold">폼 생성/수정</span>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{form ? '폼 수정' : '새 폼 만들기'}</CardTitle>
            <CardDescription>
              고객 정보를 수집할 폼을 생성하고 관리합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 폼 URL (이미 생성된 경우) */}
            {form && (
              <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
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
              </div>
            )}
            
            {/* 폼 제목과 설명 */}
            <div className="space-y-2">
              <Label htmlFor="title">폼 제목</Label>
              <Input
                id="title"
                placeholder="예: 인플루언서 모집"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">폼 설명</Label>
              <Textarea
                id="description"
                placeholder="폼 상단에 표시될 설명을 입력하세요"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            {/* 기본 필드 선택 */}
            <div className="space-y-2">
              <Label>기본 필드 설정</Label>
              <div className="space-y-2 p-4 border rounded-lg">
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">추가 필드</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingFieldIndex(null)
                    setNewFieldLabel('')
                    setNewFieldType('text')
                    setNewFieldRequired(false)
                    setNewFieldPlaceholder('')
                    setNewFieldOptions(['옵션 1'])
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  새 필드 추가
                </Button>
              </div>
              
              {/* 기존 커스텀 필드 목록 */}
              <div className="space-y-2">
                {customFields.map((field, index) => (
                  <div key={field.name} className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium">{field.label}</div>
                      <div className="text-sm text-gray-500">
                        {field.type === 'text' && '단답형 텍스트'}
                        {field.type === 'tel' && '전화번호'}
                        {field.type === 'email' && '이메일'}
                        {field.type === 'url' && 'URL 링크'}
                        {field.type === 'textarea' && '장문형 텍스트'}
                        {field.type === 'select' && `선택 (${field.options?.length || 0}개 옵션)`}
                        {field.type === 'radio' && `라디오 (${field.options?.length || 0}개 옵션)`}
                        {field.required && ' • 필수'}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => editCustomField(index)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCustomField(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* 새 필드 추가 폼 */}
              <div className="border rounded-lg p-4 space-y-3 bg-blue-50">
                <div className="font-medium text-blue-900 mb-2">
                  {editingFieldIndex !== null ? '필드 수정' : '새 필드 만들기'}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="field-label">필드 제목</Label>
                    <Input
                      id="field-label"
                      placeholder="예: 참여 동기"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="field-type">필드 유형</Label>
                    <select
                      id="field-type"
                      className="w-full px-3 py-2 border rounded-md"
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as FormField['type'])}
                    >
                      <option value="text">단답형 텍스트</option>
                      <option value="textarea">장문형 텍스트</option>
                      <option value="tel">전화번호</option>
                      <option value="email">이메일</option>
                      <option value="url">URL 링크</option>
                      <option value="select">드롭다운 선택</option>
                      <option value="radio">라디오 버튼</option>
                    </select>
                  </div>
                </div>
                
                {/* 플레이스홀더 (텍스트 필드용) */}
                {(newFieldType === 'text' || newFieldType === 'textarea' || newFieldType === 'tel' || 
                  newFieldType === 'email' || newFieldType === 'url') && (
                  <div>
                    <Label htmlFor="field-placeholder">도움말 텍스트 (선택사항)</Label>
                    <Input
                      id="field-placeholder"
                      placeholder="입력 예시나 설명을 추가하세요"
                      value={newFieldPlaceholder}
                      onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                    />
                  </div>
                )}
                
                {/* 선택 옵션 (select, radio용) */}
                {(newFieldType === 'select' || newFieldType === 'radio') && (
                  <div className="space-y-2">
                    <Label>선택 옵션</Label>
                    <div className="space-y-2">
                      {newFieldOptions.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`옵션 ${index + 1}`}
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                          />
                          {newFieldOptions.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeOption(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addOption}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        옵션 추가
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="new-field-required"
                      checked={newFieldRequired}
                      onChange={(e) => setNewFieldRequired(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="new-field-required" className="text-sm">
                      필수 입력 필드로 설정
                    </label>
                  </div>
                  
                  <div className="flex gap-2">
                    {editingFieldIndex !== null && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingFieldIndex(null)
                          setNewFieldLabel('')
                          setNewFieldType('text')
                          setNewFieldRequired(false)
                          setNewFieldPlaceholder('')
                          setNewFieldOptions(['옵션 1'])
                        }}
                      >
                        취소
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={addCustomField}
                      disabled={!newFieldLabel}
                    >
                      {editingFieldIndex !== null ? '수정 완료' : '필드 추가'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 액션 버튼 */}
            <div className="flex gap-2">
              <Button
                onClick={form ? handleUpdateForm : handleCreateForm}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  form ? '폼 업데이트' : '폼 생성하기'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
              >
                돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function FormBuilderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FormBuilderContent />
    </Suspense>
  )
}