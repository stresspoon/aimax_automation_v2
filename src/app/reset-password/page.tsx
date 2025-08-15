"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("유효하지 않은 재설정 링크입니다");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("모든 필드를 입력해주세요");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '비밀번호 재설정에 실패했습니다');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      setError((error as Error).message || '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-2xl shadow-lg border p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-2">비밀번호가 변경되었습니다</h2>
            <p className="text-muted-foreground mb-6">
              새로운 비밀번호로 로그인해주세요
            </p>

            <Link 
              href="/login"
              className="block w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition"
            >
              로그인 페이지로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-card rounded-2xl shadow-lg border p-8">
          <Link href="/" className="block text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">AIMAX</h1>
          </Link>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">새 비밀번호 설정</h2>
          <p className="text-muted-foreground mb-6">
            새로운 비밀번호를 입력해주세요
          </p>

          {!token ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">유효하지 않은 재설정 링크입니다</p>
              <Link 
                href="/forgot-password"
                className="text-primary hover:text-primary/80 font-semibold"
              >
                비밀번호 재설정 다시 요청하기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  새 비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8자 이상"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                  새 비밀번호 확인
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 재입력"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                  required
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "변경 중..." : "비밀번호 변경"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-muted-foreground hover:text-foreground text-sm">
              로그인 페이지로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}