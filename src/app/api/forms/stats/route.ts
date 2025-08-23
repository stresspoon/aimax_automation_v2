import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const searchParams = req.nextUrl.searchParams
  const formId = searchParams.get('formId')

  if (!formId) {
    return NextResponse.json({ error: 'Form ID is required' }, { status: 400 })
  }

  try {
    const { data: tempResponses } = await supabase
      .from('form_responses_temp')
      .select('*')
      .eq('form_id', formId)

    const { data: processedResponses } = await supabase
      .from('processing_queue')
      .select('*')
      .eq('form_id', formId)

    const totalResponses = (tempResponses?.length || 0) + (processedResponses?.length || 0)
    const selectedCandidates = processedResponses?.filter(r => r.is_selected).length || 0
    const pendingReview = tempResponses?.length || 0
    const conversionRate = totalResponses > 0 ? (selectedCandidates / totalResponses) * 100 : 0

    return NextResponse.json({
      totalResponses,
      selectedCandidates,
      pendingReview,
      conversionRate
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}