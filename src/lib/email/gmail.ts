import { google } from 'googleapis'
import { Buffer } from 'node:buffer'
import { createAdminClient } from '@/lib/supabase/admin'

export async function sendViaGmailAsUser(params: { userId: string, to: string, subject: string, html: string, fromEmail?: string }) {
  const admin = createAdminClient()
  const { data: conn, error } = await admin
    .from('gmail_connections')
    .select('*')
    .eq('user_id', params.userId)
    .single()

  if (error || !conn) {
    throw new Error('Gmail connection not found')
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Google OAuth env missing')

  const oAuth2 = new google.auth.OAuth2(clientId, clientSecret)
  oAuth2.setCredentials({ refresh_token: conn.refresh_token })

  const gmail = google.gmail({ version: 'v1', auth: oAuth2 })

  const from = params.fromEmail || conn.email
  const msg =
    `From: ${from}\r\n` +
    `To: ${params.to}\r\n` +
    `Subject: ${params.subject}\r\n` +
    `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
    params.html

  const raw = Buffer.from(msg).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })
  return { ok: true }
}


