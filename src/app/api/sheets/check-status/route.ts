import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 체크 결과를 저장할 글로벌 스토어
declare global {
  var candidatesStore: Record<string, any[]> | undefined
}

const candidatesStore = globalThis.candidatesStore || {}
globalThis.candidatesStore = candidatesStore

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }
  
  try {
    // Supabase에서 프로젝트 데이터 가져오기
    const supabase = await createClient()
    const { data: project, error } = await supabase
      .from('projects')
      .select('data')
      .eq('id', projectId)
      .single()
    
    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // 프로젝트 데이터에서 candidates 가져오기
    const candidates = project.data?.step2?.candidates || []
    
    return NextResponse.json({ 
      updatedCandidates: candidates,
      total: candidates.length,
      selected: candidates.filter((c: any) => c.status === 'selected').length,
      notSelected: candidates.filter((c: any) => c.status === 'notSelected').length,
    })
  } catch (err) {
    console.error('Check status error:', err)
    return NextResponse.json({ 
      error: 'Failed to get check status' 
    }, { status: 500 })
  }
}