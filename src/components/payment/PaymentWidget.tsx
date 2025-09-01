'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

declare global {
  interface Window {
    TossPayments: any
  }
}

interface PaymentWidgetProps {
  amount: number
  orderName: string
  productType: 'subscription' | 'credit' | 'one-time'
  projectId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  onSuccess?: (payment: any) => void
  onError?: (error: any) => void
}

export function PaymentWidget({
  amount,
  orderName,
  productType,
  projectId,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onError
}: PaymentWidgetProps) {
  const [paymentWidget, setPaymentWidget] = useState<any>(null)
  const [paymentMethodsWidget, setPaymentMethodsWidget] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)
  const paymentMethodsWidgetRef = useRef<HTMLDivElement>(null)

  // 결제 위젯 초기화
  useEffect(() => {
    const initializeWidget = async () => {
      try {
        // SDK 로드 대기
        let attempts = 0
        while (!window.TossPayments && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }

        if (!window.TossPayments) {
          throw new Error('토스페이먼츠 SDK 로드 실패')
        }

        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
        const customerKey = `CUSTOMER_${Date.now()}`
        
        // 토스페이먼츠 초기화
        const tossPayments = window.TossPayments(clientKey)
        
        // 결제 위젯 사용
        setPaymentWidget(tossPayments)
      } catch (error) {
        console.error('Payment widget initialization error:', error)
        toast.error('결제 위젯 초기화 실패')
      }
    }

    initializeWidget()
  }, [])

  // 결제 방법 위젯 렌더링
  useEffect(() => {
    const renderWidget = async () => {
      if (paymentWidget) {
        try {
          // Payment Widget SDK는 사용하지 않고 직접 결제 요청
          setPaymentMethodsWidget(paymentWidget)
        } catch (error) {
          console.error('Widget setup error:', error)
        }
      }
    }

    renderWidget()
  }, [paymentWidget])

  // 결제 요청 생성
  const createPayment = async () => {
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          orderName,
          productType,
          projectId,
          customerName,
          customerEmail,
          customerPhone
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Payment creation failed:', data)
        throw new Error(data.error || '결제 생성 실패')
      }
      return data.payment
    } catch (error) {
      console.error('Payment creation error:', error)
      throw error
    }
  }

  // 결제 요청
  const handlePayment = async () => {
    if (!paymentWidget) {
      toast.error('결제 위젯이 초기화되지 않았습니다')
      return
    }

    if (!paymentMethodsWidget) {
      toast.error('결제 수단을 선택해주세요')
      return
    }

    setIsLoading(true)

    try {
      // 1. 결제 정보 생성
      const payment = await createPayment()
      setPaymentData(payment)

      // 2. 결제 요청
      await paymentWidget.requestPayment({
        orderId: payment.orderId,
        orderName: payment.orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: payment.customerEmail,
        customerName: payment.customerName,
        customerMobilePhone: payment.customerPhone?.replace(/-/g, '')
      })

    } catch (error: any) {
      console.error('Payment request error:', error)
      
      if (error.code === 'USER_CANCEL') {
        toast.info('결제가 취소되었습니다')
      } else {
        toast.error(error.message || '결제 요청 실패')
        onError?.(error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">결제 정보</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>상품명: {orderName}</p>
          <p>결제 금액: {amount.toLocaleString()}원</p>
        </div>
      </div>

      {/* 결제 방법 선택 영역 */}
      <div 
        id="payment-methods"
        ref={paymentMethodsWidgetRef} 
        className="w-full"
        style={{ minHeight: '200px' }}
      />

      {/* 약관 동의 영역 - 토스페이먼츠 위젯이 자동 제공 */}
      <div id="payment-agreement" />

      {/* 결제 버튼 */}
      <Button
        onClick={handlePayment}
        disabled={isLoading || !paymentWidget}
        className="w-full"
        size="lg"
      >
        {isLoading ? '처리 중...' : `${amount.toLocaleString()}원 결제하기`}
      </Button>

      {/* 테스트 환경 안내 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
          <p className="font-semibold mb-1">테스트 결제 정보</p>
          <p>카드번호: 4242-4242-4242-4242</p>
          <p>유효기간: 12/28</p>
          <p>CVC: 123</p>
          <p>비밀번호: 00</p>
        </div>
      )}
    </Card>
  )
}