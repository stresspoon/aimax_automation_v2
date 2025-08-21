import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { verifyAdmin } from '@/lib/admin-auth'
import { logActivity } from '@/lib/activity-logger'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const userId = params.id
    
    const adminResult = await verifyAdmin(request)
    if (adminResult.error) {
      return NextResponse.json(
        { error: adminResult.error.message },
        { status: adminResult.error.status }
      )
    }

    const body = await request.json()
    const { role, plan, status } = body

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

    // Get current user data for logging
    const { data: currentUser } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const updates: any = {}
    const changes: string[] = []

    if (role && role !== currentUser?.role) {
      updates.role = role
      changes.push(`role: ${currentUser?.role} → ${role}`)
      await logActivity('user.role_change', {
        user_id: userId,
        old_role: currentUser?.role,
        new_role: role,
        changed_by: adminResult.user.id
      })
    }

    if (plan && plan !== currentUser?.plan) {
      updates.plan = plan
      changes.push(`plan: ${currentUser?.plan} → ${plan}`)
    }

    if (status && status !== currentUser?.status) {
      updates.status = status
      changes.push(`status: ${currentUser?.status} → ${status}`)
      await logActivity('user.status_change', {
        user_id: userId,
        old_status: currentUser?.status,
        new_status: status,
        changed_by: adminResult.user.id
      })
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No changes to apply' })
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log general update activity
    await logActivity('user.update', {
      user_id: userId,
      changes: changes.join(', '),
      updated_fields: Object.keys(updates),
      changed_by: adminResult.user.id
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('User update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const userId = params.id
    
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

    // Get user data before deletion for logging
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId)

    if (error) {
      throw error
    }

    // Log deletion activity
    await logActivity('user.delete', {
      deleted_user_id: userId,
      deleted_user_email: userData?.email,
      deleted_by: adminResult.user.id
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}