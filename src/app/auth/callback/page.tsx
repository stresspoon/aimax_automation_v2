"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export default function AuthCallbackPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();
        
        // Get the code from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          // Exchange code for session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Auth callback error:', error);
            router.push('/login?error=auth_failed');
            return;
          }

          if (data.user) {
            // Set user in store
            setUser({
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
            });

            // Redirect to dashboard
            router.push('/dashboard');
          }
        } else {
          // Handle error
          const error = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');
          console.error('OAuth error:', error, errorDescription);
          router.push('/login?error=oauth_failed');
        }
      } catch (error) {
        console.error('Callback handling error:', error);
        router.push('/login?error=callback_failed');
      }
    };

    handleCallback();
  }, [router, setUser]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">로그인 처리 중...</p>
      </div>
    </div>
  );
}