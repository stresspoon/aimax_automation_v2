import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { verifyAdmin } from '@/lib/admin-auth'
import { logActivity } from '@/lib/activity-logger'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const campaignId = params.id
    
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

    const { data, error } = await supabase
      .from('campaigns')
      .select('*, user_profiles(email)')
      .eq('id', campaignId)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Campaign fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const campaignId = params.id
    
    const adminResult = await verifyAdmin(request)
    if (adminResult.error) {
      return NextResponse.json(
        { error: adminResult.error.message },
        { status: adminResult.error.status }
      )
    }

    const body = await request.json()

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

    // Get current campaign data for logging
    const { data: currentCampaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    const updates = {
      ...body,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', campaignId)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log status change if applicable
    if (body.status && body.status !== currentCampaign?.status) {
      await logActivity('campaign.status_change', {
        campaign_id: campaignId,
        campaign_name: currentCampaign?.name,
        old_status: currentCampaign?.status,
        new_status: body.status,
        changed_by: adminResult.user.id
      })
    }

    // Log general update
    await logActivity('campaign.update', {
      campaign_id: campaignId,
      campaign_name: data.name,
      updated_fields: Object.keys(body),
      changed_by: adminResult.user.id
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Campaign update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update campaign' },
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
    const campaignId = params.id
    
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

    // Get campaign data before deletion
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId)

    if (error) {
      throw error
    }

    // Log deletion
    await logActivity('campaign.delete', {
      campaign_id: campaignId,
      campaign_name: campaignData?.name,
      deleted_by: adminResult.user.id
    })

    return NextResponse.json({ message: 'Campaign deleted successfully' })
  } catch (error: any) {
    console.error('Campaign deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}