"use client"
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function OAuthCallbackPage() {
  const [status, setStatus] = useState('처리 중...')

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const providerToken = sessionData.session?.provider_token
      const refreshToken = sessionData.session?.provider_refresh_token
      const user = sessionData.session?.user

      if (!user || !refreshToken) {
        setStatus('인증 정보가 없습니다. 다시 시도해주세요.')
        return
      }

      const email = user.email || ''
      const res = await fetch('/api/oauth/google/gmail/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, accessToken: providerToken, email }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setStatus(`연결 실패: ${j.error || res.statusText}`)
        return
      }
      setStatus('Gmail 연결이 완료되었습니다. 창을 닫아주세요.')
    })()
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h2>Gmail 연결</h2>
      <p>{status}</p>
    </div>
  )
}


