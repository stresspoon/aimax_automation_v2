import crypto from 'crypto'

export function computeEventHash(body: string) {
  return crypto.createHash('sha256').update(body).digest('hex')
}

export function verifyTossSignature(body: string, signature: string | null, secret: string | undefined): boolean {
  if (!secret || !signature) return false
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const expectedSignature = hmac.digest('base64')
  return signature === expectedSignature
}

