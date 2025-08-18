import { NextResponse, type NextRequest } from 'next/server'

// Note: This is a placeholder that forwards to an external Playwright service if configured.
// For full in-process Playwright, run a separate worker to avoid heavy deps in Next runtime.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const target = searchParams.get('url')
  const upstream = process.env.PLAYWRIGHT_PROXY_URL
  if (!target) return NextResponse.json({ error: 'url is required' }, { status: 400 })
  if (!upstream) return NextResponse.json({ error: 'PLAYWRIGHT_PROXY_URL not configured' }, { status: 500 })
  try {
    const res = await fetch(`${upstream}${encodeURIComponent(target)}`)
    const html = await res.text()
    if (!res.ok) return NextResponse.json({ error: html }, { status: res.status })
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}


