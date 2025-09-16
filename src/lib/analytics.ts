export async function trackActivity(action: string, details?: Record<string, any> & { campaign_id?: string; project_id?: string }) {
  try {
    const res = await fetch('/api/activity/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...(details || {}) })
    })
    if (!res.ok) {
      // swallow but log to console for debugging
      const text = await res.text()
      console.warn('trackActivity failed:', res.status, text)
    }
  } catch (e) {
    console.warn('trackActivity error:', e)
  }
}
