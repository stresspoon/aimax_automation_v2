export interface FetchJSONOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  timeoutMs?: number
  signal?: AbortSignal
}

export async function fetchJSON<T = any>(url: string | URL, opts: FetchJSONOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, timeoutMs = 15000, signal } = opts
  const controller = new AbortController()
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    signal: controller.signal,
  }
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body)

  // If caller provided a signal, mirror it to our controller
  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      signal.addEventListener('abort', () => {
        try { 
          controller.abort() 
        } catch (abortError) {
          console.warn('[HTTPClient] Failed to abort controller:', abortError);
        }
      })
    }
  }

  const timer = setTimeout(() => {
    try { controller.abort() } catch {}
  }, timeoutMs)

  try {
    const res = await fetch(url, init)
    clearTimeout(timer)
    const text = await res.text()
    const isJson = (res.headers.get('content-type') || '').includes('application/json')
    const data = isJson && text ? safeJson(text) : (text as any)
    if (!res.ok) {
      const msg = (data && typeof data === 'object' && 'error' in data) ? (data as any).error : (text || `HTTP ${res.status}`)
      const err: any = new Error(String(msg))
      err.status = res.status
      err.data = data
      throw err
    }
    return (data as T)
  } catch (err: any) {
    clearTimeout(timer)
    if (err && (err.name === 'AbortError' || (err.cause && err.cause.name === 'AbortError'))) {
      const e: any = new Error('Request timeout')
      e.code = 'ETIMEDOUT'
      throw e
    }
    throw err
  }
}

function safeJson(text: string) {
  try { 
    return JSON.parse(text) 
  } catch (error) { 
    console.warn('[HTTPClient] Failed to parse JSON:', error);
    return text 
  }
}
