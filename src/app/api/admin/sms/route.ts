import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'
import { MockSmsProvider } from '@/lib/sms/mockProvider'

export async function POST(req: NextRequest) {
  // 관리자 권한 확인
  const admin = await verifyAdmin(req)
  if (admin.error) {
    return NextResponse.json({ error: admin.error.message }, { status: admin.error.status || 403 })
  }

  try {
    const body = await req.json()
    const to = (body?.to || []) as string[]
    const message = String(body?.message || '')
    const from = body?.from ? String(body.from) : undefined
    if (!Array.isArray(to) || to.length === 0 || !message) {
      return NextResponse.json({ error: 'to[] and message are required' }, { status: 400 })
    }

    const provider = new MockSmsProvider()
    const result = await provider.send(to, message)
    return NextResponse.json({ provider: provider.providerName, from, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'sms send failed' }, { status: 500 })
  }
}


