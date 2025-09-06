import { describe, it, expect } from 'vitest'
import { CreatePaymentSchema, ConfirmPaymentSchema } from '../src/app/api/payments/schema'

describe('payments schemas', () => {
  it('create payment schema valid', () => {
    const r = CreatePaymentSchema.safeParse({ amount: 1000, orderName: '테스트', productType: 'subscription' })
    expect(r.success).toBe(true)
  })
  it('create payment schema invalid amount', () => {
    const r = CreatePaymentSchema.safeParse({ amount: 50, orderName: 'x', productType: 'credit' })
    expect(r.success).toBe(false)
  })
  it('confirm schema ok', () => {
    const r = ConfirmPaymentSchema.safeParse({ paymentKey: 'pk_12345678', orderId: 'ORDER_12345678', amount: 100 })
    expect(r.success).toBe(true)
  })
})

