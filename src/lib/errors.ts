export function errorMessage(err: unknown, fallback = '오류가 발생했습니다'): string {
  try {
    if (err == null) return fallback
    if (typeof err === 'string') return err
    if (err instanceof Error && err.message) return err.message
    if (typeof err === 'object') {
      const anyErr = err as any
      if (typeof anyErr.error === 'string' && anyErr.error) return anyErr.error
      if (typeof anyErr.message === 'string' && anyErr.message) return anyErr.message
    }
    return fallback
  } catch {
    return fallback
  }
}
