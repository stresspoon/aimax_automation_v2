import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/admin-auth'
import { logActivity } from '@/lib/activity-logger'

// 캠페인 목록 조회
export async function GET(request: NextRequest) {
  // 관리자 권한 확인
  const { user, error } = await verifyAdmin(request)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 403 })
  }

  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  
  // 쿼리 파라미터
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const platform = searchParams.get('platform') || ''
  const sortBy = searchParams.get('sortBy') || 'created_at'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  try {
    // 기본 쿼리
    let query = supabase
      .from('campaigns')
      .select(`
        *,
        user:user_profiles!campaigns_user_id_fkey(
          email,
          full_name
        )
      `, { count: 'exact' })

    // 검색 필터
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // 상태 필터
    if (status) {
      query = query.eq('status', status)
    }

    // 플랫폼 필터
    if (platform) {
      query = query.eq('platform', platform)
    }

    // 정렬
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: campaigns, error: queryError, count } = await query

    if (queryError) {
      throw queryError
    }

    // 캠페인 성과 지표 계산 (임시 데이터)
    const enrichedCampaigns = campaigns?.map(campaign => {
      const impressions = Math.floor(Math.random() * 1000000) + 100000
      const clicks = Math.floor(impressions * 0.03)
      const conversions = Math.floor(clicks * 0.1)
      const ctr = ((clicks / impressions) * 100).toFixed(2)
      const spent = campaign.budget ? Math.floor(campaign.budget * 0.7) : 0
      
      return {
        ...campaign,
        impressions,
        clicks,
        conversions,
        ctr: parseFloat(ctr),
        spent,
        progress: campaign.budget ? Math.floor((spent / campaign.budget) * 100) : 0
      }
    }) || []

    return NextResponse.json({
      campaigns: enrichedCampaigns,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('캠페인 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '캠페인 목록을 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// 캠페인 상태 변경
export async function PATCH(request: NextRequest) {
  // 관리자 권한 확인
  const { user, error } = await verifyAdmin(request)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 403 })
  }

  const supabase = await createClient()
  
  try {
    const body = await request.json()
    const { campaignId, status } = body

    if (!campaignId || !status) {
      return NextResponse.json(
        { error: '캠페인 ID와 상태가 필요합니다' },
        { status: 400 }
      )
    }

    // 유효한 상태값 체크
    const validStatuses = ['draft', 'active', 'paused', 'completed', 'failed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태값입니다' },
        { status: 400 }
      )
    }

    // 캠페인 상태 업데이트
    const { data, error: updateError } = await supabase
      .from('campaigns')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // 활동 로그 기록
    await logActivity('campaign.status_change', {
      campaign_id: campaignId,
      campaign_name: data.name,
      new_status: status,
      changed_by: user.id
    }, user.id)

    return NextResponse.json({
      message: '캠페인 상태가 변경되었습니다',
      campaign: data
    })
  } catch (error) {
    console.error('캠페인 상태 변경 오류:', error)
    return NextResponse.json(
      { error: '캠페인 상태 변경 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// 캠페인 삭제
export async function DELETE(request: NextRequest) {
  // 관리자 권한 확인
  const { user, error } = await verifyAdmin(request)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const campaignId = searchParams.get('campaignId')

  if (!campaignId) {
    return NextResponse.json(
      { error: '캠페인 ID가 필요합니다' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  try {
    // 캠페인 삭제
    const { error: deleteError } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId)

    if (deleteError) {
      throw deleteError
    }

    // 활동 로그 기록
    await logActivity('campaign.delete', {
      campaign_id: campaignId,
      deleted_by: user.id
    }, user.id)

    return NextResponse.json({
      message: '캠페인이 삭제되었습니다'
    })
  } catch (error) {
    console.error('캠페인 삭제 오류:', error)
    return NextResponse.json(
      { error: '캠페인 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// 캠페인 생성
export async function POST(request: NextRequest) {
  // 관리자 권한 확인  
  const { user, error } = await verifyAdmin(request)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 403 })
  }

  const supabase = await createClient()
  
  try {
    const body = await request.json()
    const { name, description, platform, budget, startDate, endDate, targetAudience } = body

    if (!name || !platform) {
      return NextResponse.json(
        { error: '캠페인 이름과 플랫폼은 필수입니다' },
        { status: 400 }
      )
    }

    // 캠페인 생성
    const { data, error: createError } = await supabase
      .from('campaigns')
      .insert({
        name,
        description,
        platform,
        budget,
        start_date: startDate,
        end_date: endDate,
        target_audience: targetAudience,
        status: 'draft',
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    // 활동 로그 기록
    await logActivity('campaign.create', {
      campaign_id: data.id,
      campaign_name: name,
      platform,
      created_by: user.id
    }, user.id)

    return NextResponse.json({
      message: '캠페인이 생성되었습니다',
      campaign: data
    })
  } catch (error) {
    console.error('캠페인 생성 오류:', error)
    return NextResponse.json(
      { error: '캠페인 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}