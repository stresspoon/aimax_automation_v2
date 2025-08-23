import { useEffect, useRef, useState } from 'react'

interface SmartPollingOptions {
  initialInterval?: number  // 초기 간격 (ms)
  minInterval?: number      // 최소 간격 (ms)
  maxInterval?: number      // 최대 간격 (ms)
  backoffMultiplier?: number // 간격 증가 배수
  onSuccess?: () => void    // 새 데이터 발견 시
  onError?: (error: Error) => void
}

export function useSmartPolling(
  callback: () => Promise<boolean>, // true 반환 시 새 데이터 있음
  options: SmartPollingOptions = {}
) {
  const {
    initialInterval = 5000,      // 5초
    minInterval = 5000,          // 최소 5초
    maxInterval = 60000,         // 최대 1분
    backoffMultiplier = 1.5,    // 1.5배씩 증가
    onSuccess,
    onError
  } = options

  const [isPolling, setIsPolling] = useState(false)
  const [currentInterval, setCurrentInterval] = useState(initialInterval)
  const [lastDataTime, setLastDataTime] = useState(Date.now())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startPolling = () => {
    setIsPolling(true)
    setCurrentInterval(initialInterval)
  }

  const stopPolling = () => {
    setIsPolling(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  useEffect(() => {
    if (!isPolling) return

    const poll = async () => {
      try {
        const hasNewData = await callback()
        
        if (hasNewData) {
          // 새 데이터 발견 - 간격을 최소로 리셋
          setCurrentInterval(minInterval)
          setLastDataTime(Date.now())
          onSuccess?.()
          console.log('📊 새 데이터 발견! 체크 간격을 5초로 리셋')
        } else {
          // 데이터 없음 - 간격 점진적 증가
          const timeSinceLastData = Date.now() - lastDataTime
          const minutesSinceLastData = timeSinceLastData / 60000
          
          if (minutesSinceLastData > 30) {
            // 30분 이상 변화 없음 - 최대 간격
            setCurrentInterval(maxInterval)
          } else if (minutesSinceLastData > 10) {
            // 10분 이상 변화 없음 - 간격 증가
            setCurrentInterval(prev => 
              Math.min(prev * backoffMultiplier, maxInterval)
            )
          }
        }
      } catch (error) {
        console.error('Polling error:', error)
        onError?.(error as Error)
      }
    }

    // 초기 실행
    poll()

    // 인터벌 설정
    intervalRef.current = setInterval(poll, currentInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPolling, currentInterval, callback, minInterval, maxInterval, backoffMultiplier, lastDataTime, onSuccess, onError])

  return {
    isPolling,
    currentInterval,
    startPolling,
    stopPolling,
    minutesSinceLastData: Math.floor((Date.now() - lastDataTime) / 60000)
  }
}