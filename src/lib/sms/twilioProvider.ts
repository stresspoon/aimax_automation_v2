import { SmsProvider, SmsSendResult } from './types'

export class TwilioSmsProvider implements SmsProvider {
  providerName = 'twilio'

  async send(to: string[], message: string): Promise<SmsSendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_FROM

    if (!accountSid || !authToken || !from) {
      throw new Error('Twilio env not configured')
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    const failed: Array<{ to: string; error: string }> = []
    let successCount = 0

    for (const dest of to) {
      try {
        const body = new URLSearchParams()
        body.set('To', dest)
        body.set('From', from)
        body.set('Body', message)

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        })
        if (!res.ok) {
          const txt = await res.text()
          failed.push({ to: dest, error: txt || String(res.status) })
        } else {
          successCount += 1
        }
      } catch (e: any) {
        failed.push({ to: dest, error: e?.message || String(e) })
      }
    }

    return { successCount, failed }
  }
}


