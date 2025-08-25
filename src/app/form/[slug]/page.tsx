'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle } from 'lucide-react'

interface FormData {
  id: string
  title: string
  description?: string
  fields: {
    default: Record<string, any>
    custom: any[]
  }
  settings: any
}

export default function PublicFormPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [form, setForm] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  
  // 폼 정보 로드
  useEffect(() => {
    async function loadForm() {
      try {
        const res = await fetch(`/api/forms?slug=${slug}`)
        if (!res.ok) throw new Error('폼을 찾을 수 없습니다')
        
        const data = await res.json()
        console.log('Loaded form data:', data)
        console.log('Custom fields:', data.fields?.custom)
        setForm(data)
        
        // 기본값 설정
        const defaults: Record<string, any> = {}
        
        // 기본 필드 기본값
        Object.entries(data.fields.default).forEach(([key, field]: [string, any]) => {
          if (field.type === 'checkbox') {
            defaults[key] = false
          } else {
            defaults[key] = ''
          }
        })
        
        // 커스텀 필드 기본값
        Object.entries(data.fields.custom || {}).forEach(([key, field]: [string, any]) => {
          if (field.type === 'checkbox') {
            defaults[key] = false
          } else {
            defaults[key] = ''
          }
        })
        
        setFormValues(defaults)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    
    loadForm()
  }, [slug])
  
  // 필드 렌더링 함수
  const renderField = (key: string, field: any) => {
    // Textarea
    if (field.type === 'textarea') {
      return (
        <>
          <Label htmlFor={key}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Textarea
            id={key}
            value={formValues[key] || ''}
            onChange={(e) => 
              setFormValues(prev => ({ ...prev, [key]: e.target.value }))
            }
            placeholder={field.placeholder || ''}
            required={field.required}
            rows={4}
          />
        </>
      )
    }
    
    // Select (dropdown)
    if (field.type === 'select' && field.options) {
      return (
        <>
          <Label htmlFor={key}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select
            value={formValues[key] || ''}
            onValueChange={(value) => 
              setFormValues(prev => ({ ...prev, [key]: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="선택해주세요" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )
    }
    
    // Radio
    if (field.type === 'radio' && field.options) {
      return (
        <>
          <Label>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <RadioGroup
            value={formValues[key] || ''}
            onValueChange={(value) => 
              setFormValues(prev => ({ ...prev, [key]: value }))
            }
          >
            {field.options.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${key}-${option}`} />
                <Label htmlFor={`${key}-${option}`} className="font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </>
      )
    }
    
    // Checkbox
    if (field.type === 'checkbox') {
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={key}
            checked={formValues[key] || false}
            onCheckedChange={(checked) => 
              setFormValues(prev => ({ ...prev, [key]: checked }))
            }
          />
          <Label htmlFor={key} className="cursor-pointer">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        </div>
      )
    }
    
    // Default: Input (text, email, tel, url, etc.)
    return (
      <>
        <Label htmlFor={key}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={key}
          type={field.type}
          value={formValues[key] || ''}
          onChange={(e) => 
            setFormValues(prev => ({ ...prev, [key]: e.target.value }))
          }
          placeholder={
            field.placeholder ||
            (field.type === 'url' ? 'https://...' :
            field.type === 'email' ? 'example@email.com' :
            field.type === 'tel' ? '010-0000-0000' :
            '')
          }
          required={field.required}
        />
      </>
    )
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    
    try {
      // 필수 필드 검증
      const requiredFields = Object.entries(form?.fields.default || {})
        .filter(([_, field]: [string, any]) => field.required)
        .map(([key]) => key)
      
      for (const field of requiredFields) {
        if (!formValues[field] || formValues[field] === '') {
          throw new Error('모든 필수 항목을 입력해주세요')
        }
      }
      
      // 개인정보 동의 체크
      if (!formValues.privacyConsent) {
        throw new Error('개인정보 활용에 동의해주세요')
      }
      
      const res = await fetch('/api/forms/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form?.id,
          ...formValues
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        if (data.duplicate) {
          throw new Error('이미 신청하셨습니다')
        }
        throw new Error(data.error || '제출 실패')
      }
      
      setSubmitted(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">신청이 완료되었습니다!</h2>
              <p className="text-gray-600">
                검토 후 선정 결과를 이메일로 안내드리겠습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{form?.title}</CardTitle>
            {form?.description && (
              <CardDescription>{form.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 기본 필드와 커스텀 필드 모두 렌더링 */}
              {(() => {
                // 모든 필드를 하나의 배열로 합치기
                const allFields = [
                  ...Object.entries(form?.fields.default || {}).map(([key, field]: [string, any]) => ({
                    key,
                    field,
                    isCustom: false
                  })),
                  ...Object.entries(form?.fields.custom || {}).map(([key, field]: [string, any]) => ({
                    key,
                    field,
                    isCustom: true
                  }))
                ]
                
                // order로 정렬
                allFields.sort((a, b) => (a.field.order || 999) - (b.field.order || 999))
                
                // 렌더링
                return allFields.map(({ key, field }) => (
                  <div key={key} className="space-y-2">
                    {renderField(key, field)}
                  </div>
                ))
              })()}
              
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              
              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    제출 중...
                  </>
                ) : (
                  '신청하기'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}