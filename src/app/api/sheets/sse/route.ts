import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  const sheetUrl = req.nextUrl.searchParams.get('sheetUrl')
  const lastRowCount = parseInt(req.nextUrl.searchParams.get('lastRowCount') || '0')
  
  if (!projectId || !sheetUrl) {
    return new Response('Missing parameters', { status: 400 })
  }

  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      let currentRowCount = lastRowCount
      
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      
      // 하트비트 전송 (연결 유지)
      const heartbeat = setInterval(() => {
        sendEvent({ type: 'heartbeat', time: new Date().toISOString() })
      }, 15000)
      
      // 체크 루프
      const checkInterval = setInterval(async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/sheets/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sheetUrl,
              projectId,
              checkNewOnly: true,
              lastRowCount: currentRowCount,
              skipSnsCheck: false
            })
          })
          
          const result = await response.json()
          
          if (result.newCandidates && result.newCandidates.length > 0) {
            currentRowCount += result.newCandidates.length
            sendEvent({
              type: 'newData',
              ...result,
              currentRowCount
            })
          }
        } catch (error) {
          sendEvent({
            type: 'error',
            message: (error as Error).message
          })
        }
      }, 5000) // 5초마다 체크
      
      // 클린업
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        clearInterval(checkInterval)
        controller.close()
      })
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}