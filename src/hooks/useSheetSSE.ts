import { useEffect, useRef, useState } from 'react'

interface UseSheetSSEOptions {
  projectId: string
  sheetUrl: string
  lastRowCount: number
  onNewData?: (data: any) => void
  onError?: (error: Error) => void
}

export function useSheetSSE(options: UseSheetSSEOptions) {
  const { projectId, sheetUrl, lastRowCount, onNewData, onError } = options
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!projectId || !sheetUrl) return

    const params = new URLSearchParams({
      projectId,
      sheetUrl,
      lastRowCount: lastRowCount.toString()
    })

    const eventSource = new EventSource(`/api/sheets/sse?${params}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('📡 SSE 연결됨')
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'newData') {
          console.log('🆕 새 데이터 감지:', data)
          setLastUpdate(new Date())
          onNewData?.(data)
        } else if (data.type === 'heartbeat') {
          // 연결 유지 신호
        } else if (data.type === 'error') {
          console.error('SSE 오류:', data.message)
          onError?.(new Error(data.message))
        }
      } catch (err) {
        console.error('SSE 파싱 오류:', err)
      }
    }

    eventSource.onerror = () => {
      console.error('❌ SSE 연결 오류')
      setIsConnected(false)
      
      // 5초 후 재연결 시도
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          console.log('🔄 SSE 재연결 시도...')
          eventSource.close()
          // 재귀적으로 다시 연결
        }
      }, 5000)
    }

    return () => {
      eventSource.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }, [projectId, sheetUrl, lastRowCount, onNewData, onError])

  return {
    isConnected,
    lastUpdate,
    disconnect: () => {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }
}