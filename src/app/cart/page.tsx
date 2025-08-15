"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-2xl font-bold text-primary">
                AIMAX
              </Link>
              <span className="ml-4 text-muted-foreground">/ 장바구니</span>
            </div>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">장바구니</h1>

        {!mounted ? (
          <div className="bg-card border rounded-xl p-12 text-center">
            <div className="text-muted-foreground">로딩 중...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-card border rounded-xl p-12 text-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">장바구니가 비어있습니다</h2>
            <p className="text-muted-foreground mb-6">원하시는 도구를 담아보세요</p>
            <Link
              href="/dashboard"
              className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition"
            >
              쇼핑 계속하기
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* 장바구니 아이템 목록 */}
            <div className="lg:col-span-2">
              <div className="bg-card border rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    상품 ({items.length}개)
                  </h2>
                  <button
                    onClick={clearCart}
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    전체 삭제
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-b border-border pb-4 last:border-0"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{item.title}</h3>
                          <p className="text-primary font-bold mt-1">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center border border-border rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-3 py-1 text-muted-foreground hover:text-foreground"
                              disabled={item.quantity <= 1}
                            >
                              -
                            </button>
                            <span className="px-4 py-1 text-foreground">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-3 py-1 text-muted-foreground hover:text-foreground"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* 주문 요약 */}
            <div className="lg:col-span-1">
              <div className="bg-card border rounded-xl p-6 sticky top-4">
                <h2 className="text-lg font-semibold text-foreground mb-4">주문 요약</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>상품 금액</span>
                    <span>{formatPrice(getTotalPrice())}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>배송비</span>
                    <span>무료</span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between text-lg font-semibold text-foreground">
                      <span>총 결제금액</span>
                      <span className="text-primary">{formatPrice(getTotalPrice())}</span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="block w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition text-center"
                >
                  결제하기
                </Link>

                <p className="mt-4 text-xs text-muted-foreground text-center">
                  안전한 결제 시스템을 통해 진행됩니다
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}