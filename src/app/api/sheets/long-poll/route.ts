import { NextResponse } from 'next/server'
import { z } from 'zod'

const BodySchema = z.object({
  sheetUrl: z.string().url(),
  projectId: z.string(),
  lastRowCount: z.number(),
  timeout: z.number().optional().default(30000) // 30초 기본
})

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json())
    const startTime = Date.now()
    
    // 최대 30초 동안 새 데이터 체크
    while (Date.now() - startTime < body.timeout) {
      // 시트 체크
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/sheets/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl: body.sheetUrl,
          projectId: body.projectId,
          checkNewOnly: true,
          lastRowCount: body.lastRowCount,
          skipSnsCheck: false
        })
      })
      
      const result = await response.json()
      
      // 새 데이터가 있으면 즉시 반환
      if (result.newCandidates && result.newCandidates.length > 0) {
        return NextResponse.json({
          hasNewData: true,
          ...result
        })
      }
      
      // 2초 대기 후 다시 체크
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    // 타임아웃 - 새 데이터 없음
    return NextResponse.json({
      hasNewData: false,
      message: 'No new data'
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}