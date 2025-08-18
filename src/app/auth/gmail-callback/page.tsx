"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function GmailCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();
        
        // Supabase가 OAuth 콜백을 자동으로 처리
        // 이미 처리된 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          router.push('/automation/customer-acquisition?error=gmail_auth_failed');
          return;
        }
        
        if (session) {
          // 현재 사용자 확인
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Provider token과 refresh token 가져오기
            const providerToken = session.provider_token;
            const providerRefreshToken = session.provider_refresh_token;
            const userEmail = user.email;
            
            if (providerToken && providerRefreshToken) {
              // Gmail 연결 정보 저장
              const res = await fetch('/api/auth/gmail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  accessToken: providerToken,
                  refreshToken: providerRefreshToken,
                  email: userEmail,
                }),
              });
              
              if (res.ok) {
                // 성공: customer acquisition 페이지로 리다이렉트
                router.push('/automation/customer-acquisition?gmail=connected');
              } else {
                const data = await res.json();
                console.error('Gmail save error:', data.error);
                router.push('/automation/customer-acquisition?error=gmail_save_failed');
              }
            } else {
              console.error('No provider tokens found');
              router.push('/automation/customer-acquisition?error=no_provider_token');
            }
          } else {
            console.error('No user found');
            router.push('/automation/customer-acquisition?error=gmail_auth_failed');
          }
        } else {
          // 세션이 없는 경우 URL 파라미터 확인
          const urlParams = new URLSearchParams(window.location.search);
          const error = urlParams.get('error');
          
          if (error) {
            const errorDescription = urlParams.get('error_description');
            console.error('Gmail OAuth error:', error, errorDescription);
            router.push('/automation/customer-acquisition?error=gmail_oauth_failed');
          } else {
            console.error('No session found after OAuth callback');
            router.push('/automation/customer-acquisition?error=gmail_auth_failed');
          }
        }
      } catch (error) {
        console.error('Gmail callback handling error:', error);
        router.push('/automation/customer-acquisition?error=gmail_callback_failed');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Gmail 연결 처리 중...</p>
      </div>
    </div>
  );
}