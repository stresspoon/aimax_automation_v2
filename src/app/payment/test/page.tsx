'use client'

import { useState } from 'react'
import { SimplePayment } from '@/components/payment/SimplePayment'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'

// 테스트용 상품 목록
const testProducts = {
  subscription: [
    { id: 'basic', name: '베이직 플랜 (월간)', amount: 29900, description: '기본 기능 + 1,000 크레딧' },
    { id: 'premium', name: '프리미엄 플랜 (월간)', amount: 59900, description: '모든 기능 + 5,000 크레딧' },
    { id: 'enterprise', name: '엔터프라이즈 플랜 (월간)', amount: 199900, description: '무제한 사용 + 전담 지원' }
  ],
  credit: [
    { id: 'credit_100', name: '100 크레딧', amount: 10000, description: '일회성 크레딧 충전' },
    { id: 'credit_500', name: '500 크레딧', amount: 45000, description: '10% 할인' },
    { id: 'credit_1000', name: '1,000 크레딧', amount: 80000, description: '20% 할인' }
  ],
  'one-time': [
    { id: 'custom', name: '커스텀 금액', amount: 1000, description: '테스트용 결제' }
  ]
}

export default function PaymentTestPage() {
  const [productType, setProductType] = useState<'subscription' | 'credit' | 'one-time'>('subscription')
  const [selectedProduct, setSelectedProduct] = useState(testProducts.subscription[0])
  const [customAmount, setCustomAmount] = useState(1000)
  const [customerInfo, setCustomerInfo] = useState({
    name: '테스트 사용자',
    email: 'test@example.com',
    phone: '010-1234-5678'
  })

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product)
  }

  const handlePaymentSuccess = (payment: any) => {
    console.log('Payment success:', payment)
    toast.success('결제가 성공적으로 완료되었습니다!')
  }

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error)
    toast.error('결제 중 오류가 발생했습니다')
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">결제 테스트</h1>
        <p className="text-muted-foreground mt-2">
          토스페이먼츠 결제 기능을 테스트할 수 있습니다
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 상품 선택 영역 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>상품 선택</CardTitle>
              <CardDescription>
                테스트할 상품 유형과 금액을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={productType} onValueChange={(v) => setProductType(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="subscription">구독</TabsTrigger>
                  <TabsTrigger value="credit">크레딧</TabsTrigger>
                  <TabsTrigger value="one-time">일회성</TabsTrigger>
                </TabsList>

                <TabsContent value="subscription" className="space-y-3">
                  <RadioGroup
                    value={selectedProduct.id}
                    onValueChange={(value) => {
                      const product = testProducts.subscription.find(p => p.id === value)
                      if (product) handleProductSelect(product)
                    }}
                  >
                    {testProducts.subscription.map((product) => (
                      <div key={product.id} className="flex items-start space-x-3">
                        <RadioGroupItem value={product.id} id={product.id} />
                        <Label htmlFor={product.id} className="flex-1 cursor-pointer">
                          <div className="font-semibold">{product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.description}</div>
                          <div className="text-sm font-semibold mt-1">
                            {product.amount.toLocaleString()}원/월
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </TabsContent>

                <TabsContent value="credit" className="space-y-3">
                  <RadioGroup
                    value={selectedProduct.id}
                    onValueChange={(value) => {
                      const product = testProducts.credit.find(p => p.id === value)
                      if (product) handleProductSelect(product)
                    }}
                  >
                    {testProducts.credit.map((product) => (
                      <div key={product.id} className="flex items-start space-x-3">
                        <RadioGroupItem value={product.id} id={product.id} />
                        <Label htmlFor={product.id} className="flex-1 cursor-pointer">
                          <div className="font-semibold">{product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.description}</div>
                          <div className="text-sm font-semibold mt-1">
                            {product.amount.toLocaleString()}원
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </TabsContent>

                <TabsContent value="one-time" className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="custom-amount">결제 금액 (원)</Label>
                    <Input
                      id="custom-amount"
                      type="number"
                      value={customAmount}
                      onChange={(e) => {
                        const amount = parseInt(e.target.value) || 100
                        setCustomAmount(amount)
                        setSelectedProduct({
                          ...testProducts['one-time'][0],
                          amount
                        })
                      }}
                      min={100}
                      step={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      최소 100원 이상 입력해주세요
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>고객 정보</CardTitle>
              <CardDescription>
                테스트용 고객 정보를 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name">이름</Label>
                <Input
                  id="customer-name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">이메일</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">전화번호</Label>
                <Input
                  id="customer-phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 결제 위젯 영역 */}
        <div>
          <SimplePayment
            amount={selectedProduct.amount}
            orderName={selectedProduct.name}
            productType={productType}
            customerName={customerInfo.name}
            customerEmail={customerInfo.email}
            customerPhone={customerInfo.phone}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </div>
      </div>
    </div>
  )
}