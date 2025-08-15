import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const BodySchema = z.object({
  email: z.string().email(),
  refreshToken: z.string().min(10),
  accessToken: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const body = BodySchema.parse(json)
    const supabase = await createClient()
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    const { error } = await supabase
      .from('gmail_connections')
      .upsert({
        user_id: userId,
        email: body.email,
        refresh_token: body.refreshToken,
        access_token: body.accessToken,
        expiry_at: null,
      })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { error } = await supabase
      .from('gmail_connections')
      .delete()
      .eq('user_id', user.id)
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 })
  }
}


