'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { fetchJSON } from '@/lib/httpClient'
import { errorMessage } from '@/lib/errors'
import Script from 'next/script'

interface SimplePaymentProps {
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

export function SimplePayment({
  amount,
  orderName,
  productType,
  projectId,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onError
}: SimplePaymentProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)

  // 결제 요청 생성
  const createPayment = async () => {
    try {
      const data = await fetchJSON<{ payment: any }>('/api/payments/create', {
        method: 'POST',
        body: {
          amount,
          orderName,
          productType,
          projectId,
          customerName,
          customerEmail,
          customerPhone
        }
      })
      return data.payment
    } catch (error) {
      console.error('Payment creation error:', error)
      throw error
    }
  }

  // 결제 요청
  const handlePayment = async () => {
    if (!isScriptLoaded) {
      toast.error('결제 시스템이 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.')
      return
    }

    setIsLoading(true)

    try {
      // 1. 결제 정보 생성
      const payment = await createPayment()

      // 2. 토스페이먼츠 결제창 호출
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
      const tossPayments = (window as any).TossPayments(clientKey)

      await tossPayments.requestPayment('카드', {
        amount: payment.amount,
        orderId: payment.orderId,
        orderName: payment.orderName,
        customerName: payment.customerName || customerName,
        customerEmail: payment.customerEmail || customerEmail,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`
      })

    } catch (error: any) {
      console.error('Payment request error:', error)
      
      if (error.code === 'USER_CANCEL') {
        toast.info('결제가 취소되었습니다')
      } else {
        toast.error(errorMessage(error, '결제 요청 실패'))
        onError?.(error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Script
        src="https://js.tosspayments.com/v1/payment"
        onLoad={() => setIsScriptLoaded(true)}
        strategy="afterInteractive"
      />
      
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">결제 정보</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>상품명: {orderName}</p>
            <p>결제 금액: {amount.toLocaleString()}원</p>
            {customerName && <p>구매자: {customerName}</p>}
            {customerEmail && <p>이메일: {customerEmail}</p>}
          </div>
        </div>

        {/* 결제 방법 안내 */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-semibold">결제 방법</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• 카드 결제</li>
            <li>• 간편 결제 (토스페이, 카카오페이 등)</li>
            <li>• 계좌이체</li>
            <li>• 가상계좌</li>
          </ul>
        </div>

        {/* 결제 버튼 */}
        <Button
          onClick={handlePayment}
          disabled={isLoading || !isScriptLoaded}
          className="w-full"
          size="lg"
        >
          {isLoading ? '처리 중...' : 
           !isScriptLoaded ? '결제 시스템 로딩 중...' :
           `${amount.toLocaleString()}원 결제하기`}
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
    </>
  )
}
