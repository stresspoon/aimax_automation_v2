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
  type: string
  required: boolean
  order: number
  enabled?: boolean
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
  const [newFieldType, setNewFieldType] = useState('text')
  const [newFieldRequired, setNewFieldRequired] = useState(false)
  
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
          order: 9 + index
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
      loadExistingForm()
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
      required: newFieldRequired,
      order: 9 + customFields.length
    }
    
    setCustomFields([...customFields, newField])
    setNewFieldLabel('')
    setNewFieldType('text')
    setNewFieldRequired(false)
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
            <div className="space-y-2">
              <Label>추가 필드</Label>
              <div className="space-y-2">
                {customFields.map((field, index) => (
                  <div key={field.name} className="flex items-center gap-2 p-2 border rounded">
                    <span className="flex-1">
                      {field.label} ({field.type})
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCustomField(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="space-y-2">
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