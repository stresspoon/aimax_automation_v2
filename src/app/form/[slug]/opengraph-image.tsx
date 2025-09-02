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

export default async function OpengraphImage({
  params,
}: {
  params: { slug: string }
}) {
  const slug = params.slug
  const baseUrl = await getBaseUrl()

  let title = '신청 폼'
  let description = '아래 정보를 입력해주세요'

  try {
    const res = await fetch(`${baseUrl}/api/forms?slug=${encodeURIComponent(slug)}`, {
      // 캐시로 불필요한 호출 방지
      next: { revalidate: 300 },
    })
    if (res.ok) {
      const data = await res.json()
      title = data?.title || title
      description = data?.description || description
    }
  } catch {
    // ignore and use defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)',
          color: 'white',
          position: 'relative',
          padding: '60px',
        }}
      >
        {/* subtle overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(60% 80% at 70% 30%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 60%)',
          }}
        />

        <div style={{ zIndex: 1, maxWidth: 1000, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              opacity: 0.9,
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 32,
            right: 40,
            fontSize: 24,
            opacity: 0.9,
            zIndex: 1,
          }}
        >
          AIMAX
        </div>
      </div>
    ),
    { ...size }
  )
}

