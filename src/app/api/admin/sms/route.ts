import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'
import { MockSmsProvider } from '@/lib/sms/mockProvider'
import { NaverSensProvider } from '@/lib/sms/sensProvider'

function getProvider() {
  // 기본은 Mock, env ENABLE_SENS === 'true'면 SENS 사용 시도
  if (process.env.ENABLE_SENS === 'true') {
    return new NaverSensProvider()
  }
  return new MockSmsProvider()
}

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
    if (!Array.isArray(to) || to.length === 0 || !message) {
      return NextResponse.json({ error: 'to[] and message are required' }, { status: 400 })
    }

    const provider = getProvider()
    const result = await provider.send(to, message)
    return NextResponse.json({ provider: provider.providerName, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'sms send failed' }, { status: 500 })
  }
}


