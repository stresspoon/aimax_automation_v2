'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Receipt, Download } from 'lucide-react'
import { toast } from 'sonner'
import { fetchJSON } from '@/lib/httpClient'
import { errorMessage } from '@/lib/errors'

interface Payment {
  id: string
  order_id: string
  order_name: string
  amount: number
  status: string
  method: string | null
  created_at: string
  approved_at: string | null
  receipt_url: string | null
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const data = await fetchJSON<{ payments: Payment[] }>(
        '/api/payments/create'
      )
      setPayments(data.payments || [])
    } catch (error) {
      console.error('Fetch payments error:', error)
      toast.error(errorMessage(error, '결제 내역을 불러올 수 없습니다'))
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      pending: { label: '대기중', variant: 'secondary' },
      ready: { label: '준비됨', variant: 'default' },
      in_progress: { label: '진행중', variant: 'default' },
      done: { label: '완료', variant: 'success' },
      canceled: { label: '취소됨', variant: 'secondary' },
      failed: { label: '실패', variant: 'destructive' },
      expired: { label: '만료됨', variant: 'secondary' },
      refunded: { label: '환불됨', variant: 'outline' }
    }

    const config = statusConfig[status] || { label: status, variant: 'default' }
    return <Badge variant={config.variant as any}>{config.label}</Badge>
  }

  const getPaymentMethod = (method: string | null) => {
    const methods: Record<string, string> = {
      card: '카드',
      virtualAccount: '가상계좌',
      transfer: '계좌이체',
      mobilePhone: '휴대폰',
      easyPay: '간편결제'
    }
    return methods[method || ''] || method || '-'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">결제 내역</h1>
        <p className="text-muted-foreground mt-2">
          결제 내역을 확인하고 영수증을 다운로드할 수 있습니다
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>결제 목록</CardTitle>
          <CardDescription>
            최근 20개의 결제 내역이 표시됩니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              결제 내역이 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>주문번호</TableHead>
                    <TableHead>상품명</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>결제수단</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>결제일시</TableHead>
                    <TableHead>영수증</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {payment.order_id}
                      </TableCell>
                      <TableCell>{payment.order_name}</TableCell>
                      <TableCell className="font-semibold">
                        {payment.amount.toLocaleString()}원
                      </TableCell>
                      <TableCell>{getPaymentMethod(payment.method)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(payment.approved_at || payment.created_at)}
                      </TableCell>
                      <TableCell>
                        {payment.receipt_url ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(payment.receipt_url!, '_blank')}
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 결제 통계 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">총 결제 금액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments
                .filter(p => p.status === 'done')
                .reduce((sum, p) => sum + p.amount, 0)
                .toLocaleString()}원
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">완료된 결제</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.filter(p => p.status === 'done').length}건
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">이번 달 결제</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments
                .filter(p => {
                  const paymentDate = new Date(p.created_at)
                  const now = new Date()
                  return paymentDate.getMonth() === now.getMonth() &&
                         paymentDate.getFullYear() === now.getFullYear()
                })
                .length}건
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
