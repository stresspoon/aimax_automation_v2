import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { verifyAdmin } from '@/lib/admin-auth'
import { logActivity } from '@/lib/activity-logger'

// 프로젝트 목록 조회 (캠페인 -> 프로젝트로 변경)
export async function GET(request: NextRequest) {
  // 관리자 권한 확인
  const { user, error } = await verifyAdmin(request)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 403 })
  }

  // Service Role 키를 사용하여 RLS 우회
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
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
    // 기본 쿼리 - projects 테이블에서 데이터 가져오기
    let query = supabase
      .from('projects')
      .select(`
        *,
        campaign:campaigns!projects_campaign_id_fkey(
          id,
          name,
          status
        ),
        user:profiles!projects_user_id_fkey(
          email,
          name
        )
      `, { count: 'exact' })

    // 검색 필터 - JSON 데이터에서 검색
    if (search) {
      // projects 테이블은 name이 없으므로 campaign name이나 data->step1->contentType에서 검색
      query = query.or(`campaign.name.ilike.%${search}%,data->>'contentType'.ilike.%${search}%`)
    }

    // 상태 필터 - campaign status로 필터
    if (status) {
      query = query.eq('campaign.status', status)
    }

    // 타입 필터 (플랫폼 -> 타입으로 변경)
    if (platform) {
      query = query.eq('type', platform)
    }

    // 정렬
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: projects, error: queryError, count } = await query

    if (queryError) {
      throw queryError
    }

    // 프로젝트 데이터 가공 (실제 데이터 사용)
    const enrichedProjects = projects?.map(project => {
      // data 필드에서 필요한 정보 추출
      const projectData = project.data || {}
      const step1 = projectData.step1 || {}
      const step2 = projectData.step2 || {}
      const step3 = projectData.step3 || {}
      
      // 수집된 후보자 수 계산
      const candidatesCount = step2.candidates?.length || 0
      const selectedCount = step3.selectedApplicants?.filter((a: any) => a.selected).length || 0
      
      return {
        id: project.id,
        name: project.campaign?.name || step1.contentType || '이름 없음',
        description: step1.description || '',
        type: project.type,
        status: project.campaign?.status || 'draft',
        step: project.step || 1,
        platform: step1.platform || 'naver',
        budget: step1.budget || 0,
        candidates: candidatesCount,
        selected: selectedCount,
        conversionRate: candidatesCount > 0 ? ((selectedCount / candidatesCount) * 100).toFixed(1) : 0,
        created_at: project.created_at,
        updated_at: project.updated_at,
        user: project.user,
        projectData: projectData
      }
    }) || []

    return NextResponse.json({
      campaigns: enrichedProjects, // 호환성을 위해 campaigns 키 유지
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('프로젝트 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '프로젝트 목록을 불러오는 중 오류가 발생했습니다' },
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

  // Service Role 키를 사용하여 RLS 우회
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  
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

  // Service Role 키를 사용하여 RLS 우회
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

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

  // Service Role 키를 사용하여 RLS 우회
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  
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