'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
        setForm(data)
        
        // 기본값 설정
        const defaults: Record<string, any> = {}
        Object.entries(data.fields.default).forEach(([key, field]: [string, any]) => {
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
              {/* 기본 필드 렌더링 */}
              {Object.entries(form?.fields.default || {})
                .sort(([, a]: any, [, b]: any) => a.order - b.order)
                .map(([key, field]: [string, any]) => (
                  <div key={key} className="space-y-2">
                    {field.type === 'checkbox' ? (
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
                    ) : (
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
                            field.type === 'url' ? 'https://...' :
                            field.type === 'email' ? 'example@email.com' :
                            field.type === 'tel' ? '010-0000-0000' :
                            ''
                          }
                          required={field.required}
                        />
                      </>
                    )}
                  </div>
                ))}
              
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