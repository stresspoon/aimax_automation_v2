import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'
import { getActivityLogs } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdmin(request)
    if (adminResult.error) {
      return NextResponse.json(
        { error: adminResult.error.message },
        { status: adminResult.error.status }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const userId = searchParams.get('userId') || undefined
    const action = searchParams.get('action') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const { logs, total } = await getActivityLogs(
      limit,
      offset,
      userId,
      action,
      startDate,
      endDate
    )

    return NextResponse.json({
      logs,
      total,
      limit,
      offset
    })
  } catch (error: any) {
    console.error('Activity logs fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity logs' },
      { status: 500 }
    )
  }
}