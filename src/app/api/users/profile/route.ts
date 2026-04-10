import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ProfileUpdateSchema = z.object({
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, '영문, 숫자, -, _ 만 사용 가능').optional(),
  full_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().max(500).optional(),
}).strict() // 허용되지 않은 필드 차단

export async function GET(_request: NextRequest) {
  try {
    
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, phone, company_name, subscription_plan, subscription_status, is_unlimited, updated_at')
      .eq('id', user.id)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(profile, {
      headers: { 'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=10' }
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
    const parsed = ProfileUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다' },
        { status: 400 }
      )
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('id, username, full_name, avatar_url, phone, company_name, subscription_plan, subscription_status, is_unlimited, updated_at')
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json(
        { error: '프로필 업데이트에 실패했습니다' },
        { status: 400 }
      )
    }

    return NextResponse.json(profile)
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}