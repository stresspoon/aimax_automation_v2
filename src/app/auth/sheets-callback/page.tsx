'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function SheetsCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient()
        
        // 현재 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          setError('Google Sheets 인증에 실패했습니다')
          setTimeout(() => router.push('/automation/customer-acquisition'), 3000)
          return
        }

        // OAuth 토큰 정보 저장
        const response = await fetch('/api/auth/sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken: session.provider_token,
            refreshToken: session.provider_refresh_token,
            email: session.user.email,
          }),
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
  }, [router])

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