"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CheckoutSuccessPage() {
  const [orderNumber] = useState(() => {
    // 랜덤 주문번호 생성
    return `AIMAX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-card rounded-2xl shadow-xl border p-8 text-center">
          {/* 성공 아이콘 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: 0.2,
              type: "spring",
              stiffness: 200,
              damping: 10
            }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>

          <h1 className="text-3xl font-bold text-foreground mb-2">주문이 완료되었습니다!</h1>
          <p className="text-muted-foreground mb-6">
            구매해 주셔서 감사합니다
          </p>

          {/* 주문 정보 */}
          <div className="bg-muted/30 rounded-lg p-4 mb-6 text-left">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">주문번호</span>
                <span className="text-foreground font-mono text-sm">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">결제일시</span>
                <span className="text-foreground text-sm">
                  {new Date().toLocaleDateString('ko-KR')} {new Date().toLocaleTimeString('ko-KR')}
                </span>
              </div>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-foreground">
              주문 확인 이메일이 발송되었습니다.
              <br />
              도구 다운로드 링크는 이메일에서 확인하실 수 있습니다.
            </p>
          </div>

          {/* 버튼 */}
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition"
            >
              대시보드로 돌아가기
            </Link>
            <Link
              href="/orders"
              className="block w-full border border-border hover:bg-muted/50 text-foreground py-3 rounded-lg font-semibold transition"
            >
              주문 내역 보기
            </Link>
          </div>

          {/* 고객 지원 */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              문의사항이 있으신가요?
            </p>
            <a href="mailto:support@aimax.com" className="text-sm text-primary hover:text-primary/80 font-semibold">
              support@aimax.com
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}