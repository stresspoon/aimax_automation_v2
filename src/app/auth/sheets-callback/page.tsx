'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

function SheetsCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        
        if (error) {
          setError('Google 인증이 취소되었습니다')
          setTimeout(() => router.push('/automation/customer-acquisition'), 3000)
          return
        }
        
        if (!code) {
          setError('인증 코드가 없습니다')
          setTimeout(() => router.push('/automation/customer-acquisition'), 3000)
          return
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('로그인이 필요합니다')
          setTimeout(() => router.push('/'), 3000)
          return
        }

        // OAuth 토큰 정보 저장
        const response = await fetch('/api/auth/sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Google Sheets 연결 실패')
        }

        // 성공 시 자동화 페이지로 리다이렉트
        router.push('/automation/customer-acquisition?sheets=connected')
      } catch (error) {
        console.error('Sheets callback error:', error)
        setError(error instanceof Error ? error.message : 'Google Sheets 연결 중 오류가 발생했습니다')
        setTimeout(() => router.push('/automation/customer-acquisition'), 3000)
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-center text-gray-600">
              Google Sheets 연결 중입니다...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SheetsCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <SheetsCallbackContent />
    </Suspense>
  )
}