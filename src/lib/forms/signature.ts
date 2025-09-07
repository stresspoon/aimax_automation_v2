import crypto from 'crypto'

export function verifyFormsSignature(body: string, signature: string | null, secret?: string): boolean {
  if (!secret || !signature) return false
  const mac = crypto.createHmac('sha256', secret)
  mac.update(body)
  const expected = mac.digest('hex')
  // 지원: hex 기본, 혹시 base64를 쓰는 경우도 비교
  const mac64 = crypto.createHmac('sha256', secret).update(body).digest('base64')
  return signature === expected || signature === mac64
}

