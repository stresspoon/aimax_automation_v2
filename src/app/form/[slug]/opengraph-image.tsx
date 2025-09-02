import { ImageResponse } from 'next/og'
import { headers } from 'next/headers'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function getBaseUrl() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('x-forwarded-host') || h.get('host') || ''
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  if (host) return `${proto}://${host}`
  return ''
}

export default async function OpengraphImage() {
  const baseUrl = await getBaseUrl()
  const logoUrl = baseUrl
    ? `${baseUrl}/assets/form-logo`
    : '/assets/form-logo'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(60% 80% at 70% 30%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 60%)',
          }}
        />
        {/* Centered logo only */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt="AIMAX logo"
          width={600}
          height={600}
          style={{
            width: 600,
            height: 600,
            objectFit: 'contain',
            filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.25))',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
