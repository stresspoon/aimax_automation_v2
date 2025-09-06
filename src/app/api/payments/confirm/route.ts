import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { badRequest, ok, serverError, unauthorized } from '@/lib/http'
import { ConfirmPaymentSchema } from '../schema'

// 결제 승인 API
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return unauthorized('Unauthorized')

    const parsed = ConfirmPaymentSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest('입력값이 올바르지 않습니다', parsed.error.flatten())
    const { paymentKey, orderId, amount } = parsed.data

    const adminSupabase = createAdminClient()

    // 결제 정보 조회
    const { data: payment, error: fetchError } = await adminSupabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json({ error: '결제 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 금액 검증
    if (payment.amount !== amount) {
      return badRequest('결제 금액이 일치하지 않습니다')
    }

    // 토스페이먼츠 결제 승인 API 호출
    const secretKey = process.env.TOSS_SECRET_KEY
    const basicToken = Buffer.from(`${secretKey}:`).toString('base64')

    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount
      })
    })

    const tossData = await tossResponse.json()

    if (!tossResponse.ok) {
      // 토스페이먼츠 에러 처리
      console.error('Toss payment confirmation error:', tossData)

      // 결제 실패 상태 업데이트
      await adminSupabase
        .from('payments')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_code: tossData.code,
          failure_message: tossData.message,
          raw_response: tossData
        })
        .eq('id', payment.id)

      // 실패 로그 기록
      await adminSupabase
        .from('payment_logs')
        .insert({
          payment_id: payment.id,
          user_id: user.id,
          action: 'approve',
          status: 'failed',
          request_data: body,
          response_data: tossData,
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent')
        })

      return badRequest(tossData.message || '결제 승인 실패')
    }

    // 결제 성공 - DB 업데이트
    const { error: updateError } = await adminSupabase
      .from('payments')
      .update({
        payment_key: paymentKey,
        status: 'done',
        approved_at: tossData.approvedAt,
        method: tossData.method,
        receipt_url: tossData.receipt?.url,
        raw_response: tossData
      })
      .eq('id', payment.id)

    if (updateError) {
      console.error('Payment update error:', updateError)
    }

    // 성공 로그 기록
    await adminSupabase
      .from('payment_logs')
      .insert({
        payment_id: payment.id,
        user_id: user.id,
        action: 'approve',
        status: 'done',
        request_data: body,
        response_data: tossData,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })

    // 구독 상품인 경우 구독 정보 생성/업데이트
    if (payment.product_type === 'subscription') {
      await handleSubscriptionPayment(adminSupabase, user.id, payment, tossData)
    }

    return ok({
      success: true,
      payment: {
        id: payment.id,
        orderId: payment.order_id,
        status: 'done',
        approvedAt: tossData.approvedAt,
        receiptUrl: tossData.receipt?.url,
        method: tossData.method,
        cardNumber: tossData.card?.number,
        cardCompany: tossData.card?.company
      }
    })

  } catch (error) {
    console.error('Payment confirmation error')
    return serverError('결제 승인 중 오류가 발생했습니다')
  }
}

// 구독 처리 함수
async function handleSubscriptionPayment(
  supabase: any,
  userId: string,
  payment: any,
  tossData: any
) {
  try {
    // 기존 구독 확인
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    const planInfo = getPlanInfo(payment.metadata?.plan_id || 'basic')

    if (existingSubscription) {
      // 기존 구독 업데이트
      await supabase
        .from('subscriptions')
        .update({
          plan_id: planInfo.id,
          plan_name: planInfo.name,
          current_payment_id: payment.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후
          monthly_credits: planInfo.credits,
          used_credits: 0
        })
        .eq('id', existingSubscription.id)
    } else {
      // 새 구독 생성
      await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: planInfo.id,
          plan_name: planInfo.name,
          status: 'active',
          current_payment_id: payment.id,
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          monthly_credits: planInfo.credits,
          used_credits: 0,
          metadata: payment.metadata
        })
    }

    // 빌링 키 저장 (자동 결제용)
    if (tossData.billingKey) {
      await supabase
        .from('billing_keys')
        .upsert({
          user_id: userId,
          billing_key: tossData.billingKey,
          customer_key: tossData.customerKey || `CUSTOMER_${userId}`,
          card_company: tossData.card?.company,
          card_number: tossData.card?.number,
          is_active: true,
          is_default: true
        }, {
          onConflict: 'customer_key'
        })
    }

  } catch (error) {
    console.error('Subscription handling error:', error)
  }
}

// 플랜 정보 반환
function getPlanInfo(planId: string) {
  const plans: any = {
    free: { id: 'free', name: '무료', credits: 100 },
    basic: { id: 'basic', name: '베이직', credits: 1000 },
    premium: { id: 'premium', name: '프리미엄', credits: 5000 },
    enterprise: { id: 'enterprise', name: '엔터프라이즈', credits: -1 } // 무제한
  }
  
  return plans[planId] || plans.basic
}
