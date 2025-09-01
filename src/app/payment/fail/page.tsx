'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle, Loader2 } from 'lucide-react'

function PaymentFailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const code = searchParams.get('code')
  const message = searchParams.get('message') || '결제가 실패했습니다'
  const orderId = searchParams.get('orderId')

  const getErrorMessage = (code: string | null) => {
    const errorMessages: Record<string, string> = {
      'USER_CANCEL': '사용자가 결제를 취소했습니다',
      'INVALID_CARD': '유효하지 않은 카드 정보입니다',
      'INSUFFICIENT_BALANCE': '잔액이 부족합니다',
      'EXCEED_MAX_AMOUNT': '결제 한도를 초과했습니다',
      'PAYMENT_TIMEOUT': '결제 시간이 초과되었습니다',
      'ALREADY_PROCESSED': '이미 처리된 결제입니다'
    }
    
    return errorMessages[code || ''] || message
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-8 max-w-md w-full">
        <div className="flex flex-col items-center space-y-6">
          <XCircle className="h-16 w-16 text-destructive" />
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">결제 실패</h2>
            <p className="text-muted-foreground">
              {getErrorMessage(code)}
            </p>
          </div>

          {(code || orderId) && (
            <div className="w-full space-y-3 pt-4 border-t">
              {orderId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">주문번호</span>
                  <span className="font-medium">{orderId}</span>
                </div>
              )}
              
              {code && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">오류 코드</span>
                  <span className="font-medium">{code}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 w-full pt-4">
            <Button
              onClick={() => router.back()}
              className="w-full"
            >
              다시 시도하기
            </Button>
            
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              대시보드로 이동
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            결제 관련 문의사항이 있으시면 고객센터로 연락해주세요.
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <PaymentFailContent />
    </Suspense>
  )
}