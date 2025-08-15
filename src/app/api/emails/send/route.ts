import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/sender'

const BodySchema = z.object({
  to: z.string().email(),
  templateId: z.enum(['generic', 'welcome', 'reset-password']).optional(),
  payload: z.record(z.any()).optional()
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const body = BodySchema.parse(json)

    const result = await sendEmail({
      to: body.to,
      templateId: body.templateId,
      payload: body.payload
    })

    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 })
  }
}


