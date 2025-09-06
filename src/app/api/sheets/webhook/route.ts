import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSheetsIntegrationEnabled } from '@/lib/flags'

export async function POST(req: Request) {
  try {
    if (!isSheetsIntegrationEnabled()) {
      return NextResponse.json({ error: 'Sheets integration disabled' }, { status: 410 })
    }
    const body = await req.json()
    console.log('📢 Webhook received from Google Sheets:', body)
    
    const { projectId, sheetUrl, event } = body
    
    if (!projectId || !sheetUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // 프로젝트 데이터 가져오기
    const supabase = await createClient()
    const { data: project } = await supabase
      .from('projects')
      .select('data')
      .eq('id', projectId)
      .single()
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // 새로운 데이터 체크를 위한 내부 sync API 호출 (현재 요청의 호스트 기준)
    const target = new URL('/api/sheets/sync', req.url)
    const syncResponse = await fetch(target.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheetUrl,
        projectId,
        selectionCriteria: project.data?.step2?.selectionCriteria,
        checkNewOnly: true,
        lastRowCount: project.data?.step2?.lastRowCount || 0
      })
    })
    
    const syncResult = await syncResponse.json()
    console.log('✅ Sync completed:', syncResult.message)
    
    return NextResponse.json({ 
      success: true, 
      message: syncResult.message 
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}
