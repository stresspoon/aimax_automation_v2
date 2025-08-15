"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    addressDetail: "",
    zipCode: "",
    paymentMethod: "card" as "card" | "bank" | "phone",
    cardNumber: "",
    cardExpiry: "",
    cardCVC: "",
    agreeToTerms: false,
  });

  useEffect(() => {
    setMounted(true);
    // 로그인한 사용자 정보 자동 입력
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handlePaymentMethodChange = (method: "card" | "bank" | "phone") => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: method,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreeToTerms) {
      alert("결제 진행을 위해 약관에 동의해주세요.");
      return;
    }

    setLoading(true);
    
    // 실제로는 결제 API 호출
    setTimeout(() => {
      clearCart();
      router.push("/checkout/success");
    }, 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(price);
  };

  if (!mounted || items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">결제할 상품이 없습니다</h2>
          <Link href="/dashboard" className="text-primary hover:text-primary/80 font-semibold">
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    );
  }

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
              <span className="ml-4 text-muted-foreground">/ 결제</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">결제하기</h1>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
          {/* 왼쪽: 주문 정보 입력 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 배송 정보 */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">배송 정보</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                      이름
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                      전화번호
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="010-0000-0000"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    이메일
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-foreground mb-2">
                      주소
                    </label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-foreground mb-2">
                      우편번호
                    </label>
                    <input
                      id="zipCode"
                      name="zipCode"
                      type="text"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="addressDetail" className="block text-sm font-medium text-foreground mb-2">
                    상세 주소
                  </label>
                  <input
                    id="addressDetail"
                    name="addressDetail"
                    type="text"
                    value={formData.addressDetail}
                    onChange={handleInputChange}
                    placeholder="아파트, 동/호수 등"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            {/* 결제 방법 */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">결제 방법</h2>
              
              <div className="space-y-3 mb-4">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={formData.paymentMethod === "card"}
                    onChange={() => handlePaymentMethodChange("card")}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="ml-3 font-medium text-foreground">신용/체크카드</span>
                </label>
                
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank"
                    checked={formData.paymentMethod === "bank"}
                    onChange={() => handlePaymentMethodChange("bank")}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="ml-3 font-medium text-foreground">무통장 입금</span>
                </label>
                
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="phone"
                    checked={formData.paymentMethod === "phone"}
                    onChange={() => handlePaymentMethodChange("phone")}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="ml-3 font-medium text-foreground">휴대폰 결제</span>
                </label>
              </div>

              {formData.paymentMethod === "card" && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <label htmlFor="cardNumber" className="block text-sm font-medium text-foreground mb-2">
                      카드 번호
                    </label>
                    <input
                      id="cardNumber"
                      name="cardNumber"
                      type="text"
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                      placeholder="0000-0000-0000-0000"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="cardExpiry" className="block text-sm font-medium text-foreground mb-2">
                        유효기간
                      </label>
                      <input
                        id="cardExpiry"
                        name="cardExpiry"
                        type="text"
                        value={formData.cardExpiry}
                        onChange={handleInputChange}
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label htmlFor="cardCVC" className="block text-sm font-medium text-foreground mb-2">
                        CVC
                      </label>
                      <input
                        id="cardCVC"
                        name="cardCVC"
                        type="text"
                        value={formData.cardCVC}
                        onChange={handleInputChange}
                        placeholder="000"
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 주문 요약 */}
          <div className="lg:col-span-1">
            <div className="bg-card border rounded-xl p-6 sticky top-4">
              <h2 className="text-xl font-bold text-foreground mb-4">주문 상품</h2>
              
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.title} x {item.quantity}
                    </span>
                    <span className="text-foreground font-medium">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>상품 금액</span>
                  <span>{formatPrice(getTotalPrice())}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>배송비</span>
                  <span>무료</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-lg font-bold text-foreground">
                    <span>총 결제금액</span>
                    <span className="text-primary">{formatPrice(getTotalPrice())}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary mt-1"
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    주문 내용을 확인했으며, 결제 진행에 동의합니다
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !formData.agreeToTerms}
                className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "처리 중..." : `${formatPrice(getTotalPrice())} 결제하기`}
              </button>

              <p className="mt-4 text-xs text-muted-foreground text-center">
                안전한 결제 시스템으로 보호됩니다
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}