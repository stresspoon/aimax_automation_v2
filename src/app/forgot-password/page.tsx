"use client";

import { useState } from "react";
import Link from "next/link";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email) {
      setError("이메일을 입력해주세요");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '비밀번호 재설정 요청에 실패했습니다');
      }

      setSubmitted(true);
    } catch (error) {
      setError((error as Error).message || '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-2xl shadow-lg border p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-2">이메일을 확인해주세요</h2>
            <p className="text-muted-foreground mb-6">
              <span className="font-semibold">{email}</span>로 비밀번호 재설정 링크를 보냈습니다.
              이메일을 확인하여 비밀번호를 재설정해주세요.
            </p>

            <div className="space-y-3">
              <Link 
                href="/login"
                className="block w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition"
              >
                로그인 페이지로 돌아가기
              </Link>
              
              <button
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                className="w-full text-muted-foreground hover:text-foreground text-sm"
              >
                다른 이메일로 재시도
              </button>
            </div>
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
          
          <h2 className="text-2xl font-bold text-foreground mb-2">비밀번호 찾기</h2>
          <p className="text-muted-foreground mb-6">
            가입하신 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
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
              {loading ? "전송 중..." : "비밀번호 재설정 링크 보내기"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              비밀번호가 기억나셨나요?{" "}
              <Link href="/login" className="text-primary hover:text-primary/80 font-semibold">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}