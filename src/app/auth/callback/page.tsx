'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient()
        
        // URL에서 code 파라미터 확인
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        if (error) {
          console.error('OAuth error:', error, errorDescription)
          router.push('/login?error=' + encodeURIComponent(errorDescription || error))
          return
        }

        if (code) {
          // Exchange code for session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError)
            router.push('/login?error=' + encodeURIComponent(exchangeError.message))
            return
          }
        }

        // 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          console.error('Session error:', sessionError)
          router.push('/login?error=' + encodeURIComponent('세션을 생성할 수 없습니다'))
          return
        }

        // 리다이렉트 URL 확인 (기본값: /dashboard)
        const next = searchParams.get('next') || '/dashboard'
        
        console.log('로그인 성공, 리다이렉트:', next)
        router.push(next)
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/login?error=' + encodeURIComponent('인증 처리 중 오류가 발생했습니다'))
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">로그인 처리 중...</p>
      </div>
    </div>
  )
}