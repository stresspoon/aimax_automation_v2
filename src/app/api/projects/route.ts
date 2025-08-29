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

    // 무료 플랜 사용자의 프로젝트 생성 제한 확인 (1개 제한 + 삭제 후 재생성 방지)
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_status, project_created_once')
        .eq('id', user.id)
        .single()

      const isFree = !profile || profile.subscription_status === 'free'
      if (isFree) {
        // 이미 한 번이라도 생성한 적이 있으면 차단
        if (profile?.project_created_once) {
          return NextResponse.json({ error: '무료 플랜은 프로젝트를 한 번만 생성할 수 있습니다.' }, { status: 403 })
        }
        // 현재 보유 프로젝트 수 확인 (삭제 전제 포함 방지용)
        const { count } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
        if ((count || 0) >= 1) {
          return NextResponse.json({ error: '무료 플랜은 프로젝트 1개만 보유할 수 있습니다.' }, { status: 403 })
        }
      }
    } catch (limitErr) {
      console.warn('프로젝트 생성 제한 확인 실패:', limitErr)
    }

    // Check if project already exists for this campaign and type
    const { data: existing } = await supabase
      .from('projects')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('user_id', user.id)
      .eq('type', type)
      .single()

    let project
    if (existing) {
      // Update existing project
      const { data: updated, error } = await supabase
        .from('projects')
        .update({
          step,
          data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      project = updated
    } else {
      // Create new project
      const { data: created, error } = await supabase
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
      project = created

      // 무료 플랜인 경우 생성 이력 플래그 설정
      try {
        await supabase
          .from('user_profiles')
          .update({ project_created_once: true })
          .eq('id', user.id)
      } catch (flagErr) {
        console.warn('project_created_once 플래그 업데이트 실패:', flagErr)
      }
    }

    return NextResponse.json(project, { status: existing ? 200 : 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}