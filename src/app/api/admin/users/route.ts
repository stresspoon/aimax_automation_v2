import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  // 관리자 권한 확인
  const { error } = await verifyAdmin(request)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 403 })
  }

  // Service Role 키로 순수 서버 클라이언트 생성 (세션/쿠키 비사용)
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
  const searchParams = request.nextUrl.searchParams
  
  // 쿼리 파라미터
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || ''
  const status = searchParams.get('status') || ''
  const plan = searchParams.get('plan') || ''
  const sortBy = searchParams.get('sortBy') || 'created_at'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  try {
    // 기본 쿼리
    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })

    // 검색 필터
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    // 역할 필터
    if (role) {
      query = query.eq('role', role)
    }

    // 상태 필터
    if (status) {
      query = query.eq('status', status)
    }

    // 플랜 필터
    if (plan) {
      query = query.eq('plan', plan)
    }

    // 정렬
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: users, error: queryError, count } = await query

    if (queryError) {
      throw queryError
    }

    // auth.users에서 추가 정보 가져오기 (마지막 로그인 시간 등)
    const userIds = users?.map(u => u.id) || []
    
    // Supabase Admin API로 auth 정보 가져오기 (service role key 필요)
    // 현재는 user_profiles 데이터만 사용
    
    // 캠페인 통계 가져오기
    const { data: campaignStats } = await supabase
      .from('campaigns')
      .select('user_id')
      .in('user_id', userIds)

    const campaignCounts = campaignStats?.reduce((acc: any, campaign) => {
      acc[campaign.user_id] = (acc[campaign.user_id] || 0) + 1
      return acc
    }, {}) || {}

    // 응답 데이터 구성
    const enrichedUsers = users?.map(user => ({
      ...user,
      campaigns: campaignCounts[user.id] || 0,
      lastActive: user.last_sign_in_at || user.updated_at, // last_sign_in_at이 있으면 사용, 없으면 updated_at 사용
    })) || []

    return NextResponse.json({
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '사용자 목록을 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// 사용자 상태 변경
export async function PATCH(request: NextRequest) {
  // 관리자 권한 확인
  const adminResult = await verifyAdmin(request)
  if (adminResult.error) {
    return NextResponse.json({ error: adminResult.error.message }, { status: adminResult.error.status || 403 })
  }

  // Service Role 키로 순수 서버 클라이언트 생성 (세션/쿠키 비사용)
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
  
  try {
    const body = await request.json()
    const { userId, updates } = body

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // 허용된 필드만 업데이트
    const allowedFields = ['status', 'role', 'plan', 'is_unlimited', 'unlimited_reason', 'unlimited_until']
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key]
        return obj
      }, {})

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: '업데이트할 필드가 없습니다' },
        { status: 400 }
      )
    }

    // 업데이트 실행
    const { data, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        ...filteredUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // 활동 로그 기록
    await supabase
      .from('activity_logs')
      .insert({
        user_id: adminResult.user.id,
        action: '사용자 정보 수정',
        details: {
          targetUserId: userId,
          changes: filteredUpdates
        }
      })

    return NextResponse.json({
      message: '사용자 정보가 업데이트되었습니다',
      user: data
    })
  } catch (error) {
    console.error('사용자 업데이트 오류:', error)
    return NextResponse.json(
      { error: '사용자 정보 업데이트 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// 사용자 삭제
export async function DELETE(request: NextRequest) {
  // 관리자 권한 확인
  const adminResult = await verifyAdmin(request)
  if (adminResult.error) {
    return NextResponse.json({ error: adminResult.error.message }, { status: adminResult.error.status || 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json(
      { error: '사용자 ID가 필요합니다' },
      { status: 400 }
    )
  }

  // Service Role 키로 순수 서버 클라이언트 생성 (세션/쿠키 비사용)
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )

  try {
    // 사용자 삭제 (cascade로 관련 데이터도 함께 삭제)
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      throw deleteError
    }

    // 활동 로그 기록
    await supabase
      .from('activity_logs')
      .insert({
        user_id: adminResult.user.id,
        action: '사용자 삭제',
        details: {
          deletedUserId: userId
        }
      })

    return NextResponse.json({
      message: '사용자가 삭제되었습니다'
    })
  } catch (error) {
    console.error('사용자 삭제 오류:', error)
    return NextResponse.json(
      { error: '사용자 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}