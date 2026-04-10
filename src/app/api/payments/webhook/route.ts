import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { badRequest, unauthorized, ok, serverError } from '@/lib/http'
import { computeEventHash, verifyTossSignature } from '@/lib/payments/toss'
import { z } from 'zod'

// 토스페이먼츠 웹훅 처리
export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = req.headers.get('toss-signature')
    const secret = process.env.TOSS_WEBHOOK_SECRET

    // 서명 검증: secret 필수 (모든 환경)
    if (!secret) {
      return serverError('Missing TOSS_WEBHOOK_SECRET')
    }
    const isValid = verifyTossSignature(body, signature, secret)
    if (!isValid) return unauthorized('Invalid signature')

    const data = JSON.parse(body)
    const { eventType, data: eventData } = data

    console.log(`Webhook received: ${eventType}`, eventData)

    const adminSupabase = createAdminClient()

    // 멱등 처리: 동일 이벤트 해시로 중복 처리 방지
    const eventHash = computeEventHash(body)
    const { data: dup } = await adminSupabase
      .from('payment_logs')
      .select('id')
      .filter('request_data->>event_hash', 'eq', eventHash)
      .maybeSingle()
    if (dup) {
      return ok({ success: true, deduplicated: true })
    }

    switch (eventType) {
      // 결제 승인 완료
      case 'PAYMENT_STATUS_CHANGED':
        await handlePaymentStatusChanged(adminSupabase, eventData)
        break

      // 가상계좌 입금 완료
      case 'DEPOSIT_CALLBACK':
        await handleDepositCallback(adminSupabase, eventData)
        break

      // 결제 취소
      case 'PAYMENT_CANCELED':
        await handlePaymentCanceled(adminSupabase, eventData)
        break

      // 환불
      case 'PAYMENT_REFUNDED':
        await handlePaymentRefunded(adminSupabase, eventData)
        break

      // 정기 결제 실패
      case 'BILLING_KEY_PAYMENT_FAILED':
        await handleBillingPaymentFailed(adminSupabase, eventData)
        break

      default:
        console.log(`Unhandled webhook event type: ${eventType}`)
    }

    // 웹훅 로그 저장
    await adminSupabase
      .from('payment_logs')
      .insert({
        user_id: eventData.customerId || null,
        payment_id: await getPaymentIdByOrderId(adminSupabase, eventData.orderId),
        action: 'webhook',
        status: eventType,
        request_data: { ...data, event_hash: eventHash },
        response_data: eventData
      })

    return ok({ success: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return serverError('Webhook processing failed')
  }
}

// 결제 상태 변경 처리
async function handlePaymentStatusChanged(supabase: any, eventData: any) {
  const { orderId, status, paymentKey, approvedAt, method } = eventData

  await supabase
    .from('payments')
    .update({
      status: status.toLowerCase(),
      payment_key: paymentKey,
      approved_at: approvedAt,
      method: method,
      raw_response: eventData
    })
    .eq('order_id', orderId)
}

// 가상계좌 입금 처리
async function handleDepositCallback(supabase: any, eventData: any) {
  const { orderId, status } = eventData

  await supabase
    .from('payments')
    .update({
      status: 'done',
      approved_at: new Date().toISOString(),
      raw_response: eventData
    })
    .eq('order_id', orderId)

  // 구독 활성화 처리
  const { data: payment } = await supabase
    .from('payments')
    .select('id, user_id, order_id, amount, status, product_type, metadata')
    .eq('order_id', orderId)
    .single()

  if (payment && payment.product_type === 'subscription') {
    await activateSubscription(supabase, payment)
  }
}

// 결제 취소 처리
async function handlePaymentCanceled(supabase: any, eventData: any) {
  const { orderId, canceledAt, cancelReason } = eventData

  await supabase
    .from('payments')
    .update({
      status: 'canceled',
      canceled_at: canceledAt,
      metadata: { cancel_reason: cancelReason },
      raw_response: eventData
    })
    .eq('order_id', orderId)

  // 구독 취소 처리
  const { data: payment } = await supabase
    .from('payments')
    .select('id, user_id, order_id, amount, status, product_type, metadata')
    .eq('order_id', orderId)
    .single()

  if (payment && payment.product_type === 'subscription') {
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: canceledAt
      })
      .eq('current_payment_id', payment.id)
  }
}

// 환불 처리
async function handlePaymentRefunded(supabase: any, eventData: any) {
  const { orderId, refunds } = eventData

  const { data: payment } = await supabase
    .from('payments')
    .select('id, user_id, order_id, amount, status, product_type, metadata')
    .eq('order_id', orderId)
    .single()

  if (!payment) return

  for (const refund of refunds) {
    await supabase
      .from('refunds')
      .upsert({
        payment_id: payment.id,
        user_id: payment.user_id,
        refund_key: refund.transactionKey,
        amount: refund.refundAmount,
        reason: refund.refundReason,
        status: refund.status.toLowerCase(),
        requested_at: refund.requestedAt,
        completed_at: refund.approvedAt,
        raw_response: refund
      }, {
        onConflict: 'refund_key'
      })
  }

  // 전액 환불인 경우 결제 상태 업데이트
  const totalRefunded = refunds.reduce((sum: number, r: any) => sum + r.refundAmount, 0)
  if (totalRefunded >= payment.amount) {
    await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('id', payment.id)
  }
}

// 정기 결제 실패 처리
async function handleBillingPaymentFailed(supabase: any, eventData: any) {
  const { customerKey, billingKey, failReason } = eventData

  // 빌링 키 비활성화
  await supabase
    .from('billing_keys')
    .update({
      is_active: false,
      metadata: { fail_reason: failReason }
    })
    .eq('billing_key', billingKey)

  // 구독 일시 중지
  const { data: billingKeyData } = await supabase
    .from('billing_keys')
    .select('user_id')
    .eq('billing_key', billingKey)
    .single()

  if (billingKeyData) {
    await supabase
      .from('subscriptions')
      .update({ status: 'suspended' })
      .eq('user_id', billingKeyData.user_id)
      .eq('status', 'active')
  }
}

// 구독 활성화
async function activateSubscription(supabase: any, payment: any) {
  const planInfo = getPlanInfo(payment.metadata?.plan_id || 'basic')

  await supabase
    .from('subscriptions')
    .upsert({
      user_id: payment.user_id,
      plan_id: planInfo.id,
      plan_name: planInfo.name,
      status: 'active',
      current_payment_id: payment.id,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      monthly_credits: planInfo.credits,
      used_credits: 0
    }, {
      onConflict: 'user_id'
    })
}

// 주문 ID로 결제 ID 조회
async function getPaymentIdByOrderId(supabase: any, orderId: string) {
  const { data } = await supabase
    .from('payments')
    .select('id')
    .eq('order_id', orderId)
    .single()
  
  return data?.id || null
}

// 플랜 정보
function getPlanInfo(planId: string) {
  const plans: any = {
    free: { id: 'free', name: '무료', credits: 100 },
    basic: { id: 'basic', name: '베이직', credits: 1000 },
    premium: { id: 'premium', name: '프리미엄', credits: 5000 },
    enterprise: { id: 'enterprise', name: '엔터프라이즈', credits: -1 }
  }
  
  return plans[planId] || plans.basic
}
