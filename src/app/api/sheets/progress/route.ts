import { NextResponse } from 'next/server'

// sync/route.ts와 동일한 메모리 스토어 참조
declare global {
  var progressStore: Record<string, {
    total: number
    current: number
    currentName: string
    status: 'loading' | 'processing' | 'completed' | 'error'
    phase: 'sheet_loading' | 'sns_checking' | 'completed'
    currentSns?: 'threads' | 'blog' | 'instagram'
    lastUpdate: number
  }> | undefined
}

const progressStore = globalThis.progressStore || {}
globalThis.progressStore = progressStore

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
  }
  
  const progress = progressStore[projectId]
  
  if (!progress) {
    return NextResponse.json({ 
      total: 0,
      current: 0,
      currentName: '',
      status: 'completed',
      phase: 'completed',
      lastUpdate: 0
    })
  }
  
  return NextResponse.json(progress)
}

export async function POST(req: Request) {
  try {
    const { projectId, total, current, currentName, status, phase, currentSns } = await req.json()
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }
    
    progressStore[projectId] = {
      total: total || 0,
      current: current || 0,
      currentName: currentName || '',
      status: status || 'processing',
      phase: phase || 'sns_checking',
      currentSns,
      lastUpdate: Date.now()
    }
    
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

