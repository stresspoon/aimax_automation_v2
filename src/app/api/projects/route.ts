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
    const campaign_id = searchParams.get('campaign_id')
    const type = searchParams.get('type')
    
    let query = supabase
      .from('projects')
      .select('*, campaigns(name, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data: projects, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(projects)
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
      campaign_id,
      type,
      step = 1,
      data = {}
    } = body

    // Verify campaign belongs to user
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or unauthorized' },
        { status: 404 }
      )
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        campaign_id,
        type,
        step,
        data
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(project, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}