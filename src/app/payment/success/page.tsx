'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get('paymentKey')
      const orderId = searchParams.get('orderId')
      const amount = searchParams.get('amount')

      if (!paymentKey || !orderId || !amount) {
        setError('필수 결제 정보가 누락되었습니다')
        setIsProcessing(false)
        return
      }

      try {
        // 결제 승인 요청
        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: parseInt(amount)
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '결제 승인 실패')
        }

        setPaymentResult(data.payment)
        toast.success('결제가 성공적으로 완료되었습니다!')

      } catch (error: any) {
        console.error('Payment confirmation error:', error)
        setError(error.message || '결제 처리 중 오류가 발생했습니다')
        toast.error(error.message || '결제 승인 실패')
      } finally {
        setIsProcessing(false)
      }
    }

    confirmPayment()
  }, [searchParams])

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">결제 처리 중...</h2>
            <p className="text-sm text-muted-foreground text-center">
              잠시만 기다려주세요. 결제를 승인하고 있습니다.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-xl font-semibold">결제 처리 실패</h2>
            <p className="text-sm text-muted-foreground text-center">
              {error}
            </p>
            <Button onClick={() => router.push('/dashboard')} className="mt-4">
              대시보드로 돌아가기
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-8 max-w-md w-full">
        <div className="flex flex-col items-center space-y-6">
          <CheckCircle className="h-16 w-16 text-green-500" />
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">결제 완료!</h2>
            <p className="text-muted-foreground">
              결제가 성공적으로 처리되었습니다
            </p>
          </div>

          {paymentResult && (
            <div className="w-full space-y-3 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">주문번호</span>
                <span className="font-medium">{paymentResult.orderId}</span>
              </div>
              
              {paymentResult.approvedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">결제 시간</span>
                  <span className="font-medium">
                    {new Date(paymentResult.approvedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
              )}

              {paymentResult.method && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">결제 수단</span>
                  <span className="font-medium">{paymentResult.method}</span>
                </div>
              )}

              {paymentResult.cardNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">카드 번호</span>
                  <span className="font-medium">{paymentResult.cardNumber}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 w-full pt-4">
            {paymentResult?.receiptUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(paymentResult.receiptUrl, '_blank')}
                className="w-full"
              >
                영수증 보기
              </Button>
            )}
            
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              대시보드로 이동
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}