"use client"
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchJSON } from '@/lib/httpClient'
import { errorMessage } from '@/lib/errors'

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
      try {
        await fetchJSON('/api/oauth/google/gmail/connect', {
          method: 'POST',
          body: { refreshToken, accessToken: providerToken, email },
        })
        setStatus('Gmail 연결이 완료되었습니다. 창을 닫아주세요.')
      } catch (e) {
        setStatus(`연결 실패: ${errorMessage(e, '요청 실패')}`)
      }
    })()
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h2>Gmail 연결</h2>
      <p>{status}</p>
    </div>
  )
}

