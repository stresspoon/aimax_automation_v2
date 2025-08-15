import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: purchase, error } = await supabase
      .from('tool_purchases')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !purchase) {
      return NextResponse.json(
        { error: 'Tool purchase not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(purchase)
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if the related order is still pending
    const { data: purchase } = await supabase
      .from('tool_purchases')
      .select('order_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (purchase) {
      const { data: order } = await supabase
        .from('orders')
        .select('status')
        .eq('id', purchase.order_id)
        .single()

      if (order && order.status !== 'pending') {
        return NextResponse.json(
          { error: 'Cannot delete tool purchase for non-pending orders' },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase
      .from('tool_purchases')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ message: 'Tool purchase deleted successfully' })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}