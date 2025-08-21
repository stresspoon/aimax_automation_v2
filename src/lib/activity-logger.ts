import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type ActivityAction = 
  | 'user.create' | 'user.update' | 'user.delete' | 'user.status_change' | 'user.role_change'
  | 'campaign.create' | 'campaign.update' | 'campaign.delete' | 'campaign.status_change'
  | 'auth.login' | 'auth.logout' | 'auth.failed'
  | 'settings.update'
  | 'api.call'

interface ActivityDetails {
  [key: string]: any
}

export async function logActivity(
  action: ActivityAction,
  details: ActivityDetails = {},
  userId?: string
) {
  try {
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

    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    }

    // Insert activity log
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action,
        details,
        ip_address: details.ip_address || null,
        user_agent: details.user_agent || null
      })

    if (error) {
      console.error('Failed to log activity:', error)
    }
  } catch (error) {
    console.error('Error in activity logger:', error)
  }
}

export async function getActivityLogs(
  limit = 50,
  offset = 0,
  userId?: string,
  action?: string,
  startDate?: string,
  endDate?: string
) {
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

  let query = supabase
    .from('activity_logs')
    .select('*, user_profiles(email, role)')
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (action) {
    query = query.eq('action', action)
  }

  if (startDate) {
    query = query.gte('created_at', startDate)
  }

  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Failed to fetch activity logs:', error)
    return { logs: [], total: 0 }
  }

  return { 
    logs: data || [], 
    total: count || 0 
  }
}