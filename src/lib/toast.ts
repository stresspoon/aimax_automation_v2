import { toast as sonnerToast } from 'sonner'

// 토스트 메시지 히스토리 관리
const toastHistory = new Map<string, number>()
const TOAST_DEBOUNCE_MS = 3000 // 3초 이내 중복 방지

/**
 * 메시지 키 생성 (중복 체크용)
 */
function getMessageKey(message: string, type: string): string {
  return `${type}:${message.toLowerCase().trim()}`
}

/**
 * 중복 체크
 */
function isDuplicate(key: string): boolean {
  const lastShown = toastHistory.get(key)
  if (!lastShown) return false
  
  const now = Date.now()
  const timeSinceLastShown = now - lastShown
  
  return timeSinceLastShown < TOAST_DEBOUNCE_MS
}

/**
 * 히스토리 업데이트
 */
function updateHistory(key: string): void {
  toastHistory.set(key, Date.now())
  
  // 오래된 항목 정리 (10개 이상이면 가장 오래된 것 제거)
  if (toastHistory.size > 10) {
    const entries = Array.from(toastHistory.entries())
    entries.sort((a, b) => a[1] - b[1])
    toastHistory.delete(entries[0][0])
  }
}

/**
 * 성공 토스트 (중복 방지)
 */
export function success(message: string, options?: any): void {
  const key = getMessageKey(message, 'success')
  if (isDuplicate(key)) return
  
  updateHistory(key)
  sonnerToast.success(message, options)
}

/**
 * 에러 토스트 (중복 방지)
 */
export function error(message: string, options?: any): void {
  const key = getMessageKey(message, 'error')
  if (isDuplicate(key)) return
  
  updateHistory(key)
  sonnerToast.error(message, options)
}

/**
 * 정보 토스트 (중복 방지)
 */
export function info(message: string, options?: any): void {
  const key = getMessageKey(message, 'info')
  if (isDuplicate(key)) return
  
  updateHistory(key)
  sonnerToast.info(message, options)
}

/**
 * 경고 토스트 (중복 방지)
 */
export function warning(message: string, options?: any): void {
  const key = getMessageKey(message, 'warning')
  if (isDuplicate(key)) return
  
  updateHistory(key)
  sonnerToast.warning(message, options)
}

/**
 * 로딩 토스트 (중복 방지 없음)
 */
export function loading(message: string, options?: any): string | number {
  return sonnerToast.loading(message, options)
}

/**
 * Promise 토스트 (중복 방지 없음)
 */
export function promise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: any) => string)
  },
  options?: any
): Promise<T> {
  sonnerToast.promise(promise, { ...messages, ...options })
  return promise
}

/**
 * 커스텀 토스트 (중복 방지 선택적)
 */
export function custom(
  message: React.ReactNode,
  options?: { preventDuplicate?: boolean; [key: string]: any }
): void {
  if (options?.preventDuplicate) {
    const key = getMessageKey(String(message), 'custom')
    if (isDuplicate(key)) return
    updateHistory(key)
  }
  
  const { preventDuplicate, ...toastOptions } = options || {}
  sonnerToast(message, toastOptions as any)
}

/**
 * 토스트 닫기
 */
export function dismiss(toastId?: string | number): void {
  sonnerToast.dismiss(toastId)
}

/**
 * 히스토리 초기화
 */
export function clearHistory(): void {
  toastHistory.clear()
}

// 기본 toast 객체와 호환성 유지
export const toast = {
  success,
  error,
  info,
  warning,
  loading,
  promise,
  custom,
  dismiss,
  clearHistory,
  // sonner의 원본 메서드도 노출
  message: sonnerToast,
}