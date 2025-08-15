import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    const toolId = searchParams.get('tool_id')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    
    let query = supabase
      .from('tool_purchases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    if (toolId) {
      query = query.eq('tool_id', toolId)
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + (limit ? parseInt(limit) - 1 : 9))
    }

    const { data: purchases, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(purchases)
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      order_id,
      tool_id,
      tool_name,
      price,
      quantity = 1
    } = body

    // Verify that the order belongs to the user
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single()

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      )
    }

    const { data: purchase, error } = await supabase
      .from('tool_purchases')
      .insert({
        user_id: user.id,
        order_id,
        tool_id,
        tool_name,
        price,
        quantity
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(purchase, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}