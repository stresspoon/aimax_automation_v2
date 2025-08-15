"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    companyName: "",
    agreeTerms: false,
    agreeMarketing: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = "이름을 입력해주세요";
    }

    if (!formData.email) {
      newErrors.email = "이메일을 입력해주세요";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "올바른 이메일 형식이 아닙니다";
    }

    if (!formData.password) {
      newErrors.password = "비밀번호를 입력해주세요";
    } else if (formData.password.length < 8) {
      newErrors.password = "비밀번호는 8자 이상이어야 합니다";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다";
    }

    if (!formData.phone) {
      newErrors.phone = "전화번호를 입력해주세요";
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/-/g, ""))) {
      newErrors.phone = "올바른 전화번호 형식이 아닙니다";
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = "이용약관에 동의해주세요";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const signup = useAuthStore((state) => state.signup);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showNotification("입력 정보를 확인해주세요", "error");
      return;
    }

    setLoading(true);

    try {
      await signup({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        companyName: formData.companyName,
        agreeMarketing: formData.agreeMarketing,
      });

      showNotification("회원가입이 완료되었습니다!", "success");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (error) {
      showNotification((error as Error).message || "회원가입에 실패했습니다", "error");
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
    // 입력시 해당 필드 에러 제거
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      {/* Toast 알림 */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`px-6 py-3 rounded-lg shadow-lg font-semibold ${
            showToast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {showToast.message}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl shadow-lg border p-8">
          <Link href="/" className="block text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">AIMAX</h1>
          </Link>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">회원가입</h2>
          <p className="text-muted-foreground mb-6">
            AIMAX와 함께 마케팅 자동화를 시작하세요
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">기본 정보</h3>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  이름 *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.name ? "border-red-500" : "border-border"
                  } bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition`}
                  placeholder="홍길동"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  이메일 *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.email ? "border-red-500" : "border-border"
                  } bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition`}
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                    비밀번호 *
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.password ? "border-red-500" : "border-border"
                    } bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition`}
                    placeholder="8자 이상"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                    비밀번호 확인 *
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.confirmPassword ? "border-red-500" : "border-border"
                    } bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition`}
                    placeholder="비밀번호 재입력"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">추가 정보</h3>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                  전화번호 *
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.phone ? "border-red-500" : "border-border"
                  } bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition`}
                  placeholder="010-1234-5678"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-foreground mb-2">
                  회사명 (선택)
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                  placeholder="회사명 입력"
                />
              </div>
            </div>

            {/* 약관 동의 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">약관 동의</h3>
              
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.agreeTerms}
                  onChange={(e) => handleInputChange("agreeTerms", e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-primary border-border rounded focus:ring-primary"
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  <span className="text-foreground">[필수]</span> 이용약관 및 개인정보처리방침에 동의합니다{" "}
                  <Link href="#" className="text-primary hover:text-primary/80 underline">
                    보기
                  </Link>
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="ml-6 text-sm text-red-500">{errors.agreeTerms}</p>
              )}

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.agreeMarketing}
                  onChange={(e) => handleInputChange("agreeMarketing", e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-primary border-border rounded focus:ring-primary"
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  <span className="text-muted-foreground">[선택]</span> 마케팅 정보 수신에 동의합니다
                </span>
              </label>
            </div>

            {/* 가입 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </form>

          {/* 구분선 */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">또는</span>
            </div>
          </div>

          {/* 소셜 로그인 */}
          <div className="mt-6 space-y-3">
            <button className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-muted/50 transition">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-foreground">Google로 계속하기</span>
            </button>
          </div>

          {/* 로그인 링크 */}
          <p className="mt-6 text-center text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-semibold">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}