import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { verifyAdmin } from '@/lib/admin-auth'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdmin(request)
    if (adminResult.error) {
      return NextResponse.json(
        { error: adminResult.error.message },
        { status: adminResult.error.status }
      )
    }

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

    // 설정 조회
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // 설정을 키-값 형태로 변환
    const settingsMap = settings?.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value
      return acc
    }, {}) || {}

    return NextResponse.json(settingsMap)
  } catch (error: any) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await verifyAdmin(request)
    if (adminResult.error) {
      return NextResponse.json(
        { error: adminResult.error.message },
        { status: adminResult.error.status }
      )
    }

    const body = await request.json()
    const { key, value, description } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

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

    // 기존 설정 확인
    const { data: existing } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single()

    let result
    if (existing) {
      // 업데이트
      const { data, error } = await supabase
        .from('system_settings')
        .update({
          value: JSON.stringify(value),
          description,
          updated_at: new Date().toISOString(),
          updated_by: adminResult.user.id
        })
        .eq('key', key)
        .select()
        .single()

      if (error) throw error
      result = data

      await logActivity('settings.update', {
        setting_key: key,
        old_value: existing.value,
        new_value: JSON.stringify(value),
        updated_by: adminResult.user.id
      }, adminResult.user.id)
    } else {
      // 새로 생성
      const { data, error } = await supabase
        .from('system_settings')
        .insert({
          key,
          value: JSON.stringify(value),
          description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: adminResult.user.id
        })
        .select()
        .single()

      if (error) throw error
      result = data

      await logActivity('settings.update', {
        setting_key: key,
        action: 'create',
        value: JSON.stringify(value),
        created_by: adminResult.user.id
      }, adminResult.user.id)
    }

    return NextResponse.json({
      message: 'Setting saved successfully',
      setting: result
    })
  } catch (error: any) {
    console.error('Setting save error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save setting' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminResult = await verifyAdmin(request)
    if (adminResult.error) {
      return NextResponse.json(
        { error: adminResult.error.message },
        { status: adminResult.error.status }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      )
    }

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

    // 삭제 전 값 가져오기
    const { data: existing } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single()

    const { error } = await supabase
      .from('system_settings')
      .delete()
      .eq('key', key)

    if (error) {
      throw error
    }

    await logActivity('settings.update', {
      setting_key: key,
      action: 'delete',
      deleted_value: existing?.value,
      deleted_by: adminResult.user.id
    }, adminResult.user.id)

    return NextResponse.json({ message: 'Setting deleted successfully' })
  } catch (error: any) {
    console.error('Setting deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete setting' },
      { status: 500 }
    )
  }
}