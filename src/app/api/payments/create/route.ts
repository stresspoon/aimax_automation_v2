import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { nanoid } from 'nanoid'

// 결제 요청 생성 API
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      amount, 
      orderName, 
      productType,
      projectId,
      customerName,
      customerEmail,
      customerPhone,
      metadata = {}
    } = body

    // 입력 유효성 검증
    if (!amount || !orderName || !productType) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      )
    }

    // 최소 금액 검증 (100원)
    if (amount < 100) {
      return NextResponse.json(
        { error: '결제 금액은 100원 이상이어야 합니다' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // 주문 ID 생성 (고유한 값)
    const orderId = `ORDER_${nanoid(16)}`

    // 결제 정보 DB 저장
    const { data: payment, error: paymentError } = await adminSupabase
      .from('payments')
      .insert({
        user_id: user.id,
        project_id: projectId || null,
        order_id: orderId,
        amount,
        currency: 'KRW',
        order_name: orderName,
        product_type: productType,
        status: 'ready',
        customer_name: customerName || user.user_metadata?.name || '',
        customer_email: customerEmail || user.email || '',
        customer_phone: customerPhone || '',
        metadata,
        requested_at: new Date().toISOString()
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment creation error:', paymentError)
      return NextResponse.json(
        { error: '결제 정보 생성 실패' },
        { status: 500 }
      )
    }

    // 결제 로그 기록
    await adminSupabase
      .from('payment_logs')
      .insert({
        payment_id: payment.id,
        user_id: user.id,
        action: 'request',
        status: 'ready',
        request_data: body,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })

    // 클라이언트로 반환할 정보
    return NextResponse.json({
      success: true,
      payment: {
        paymentId: payment.id,
        orderId: payment.order_id,
        orderName: payment.order_name,
        amount: payment.amount,
        customerName: payment.customer_name,
        customerEmail: payment.customer_email,
        customerPhone: payment.customer_phone,
        // 토스페이먼츠 클라이언트 키는 환경변수에서 가져옴
        clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      }
    })

  } catch (error) {
    console.error('Payment creation error:', error)
    return NextResponse.json(
      { error: '결제 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// 결제 정보 조회 API
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('paymentId')
    const orderId = searchParams.get('orderId')

    if (!paymentId && !orderId) {
      // 사용자의 모든 결제 내역 조회
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Payment fetch error:', error)
        return NextResponse.json(
          { error: '결제 내역 조회 실패' },
          { status: 500 }
        )
      }

      return NextResponse.json({ payments })
    }

    // 특정 결제 정보 조회
    let query = supabase.from('payments').select('*').eq('user_id', user.id)
    
    if (paymentId) {
      query = query.eq('id', paymentId)
    } else if (orderId) {
      query = query.eq('order_id', orderId)
    }

    const { data: payment, error } = await query.single()

    if (error || !payment) {
      return NextResponse.json(
        { error: '결제 정보를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json({ payment })

  } catch (error) {
    console.error('Payment fetch error:', error)
    return NextResponse.json(
      { error: '결제 정보 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}