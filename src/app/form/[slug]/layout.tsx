import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const supabase = await createClient()
  const { slug } = await params

  try {
    const { data: form } = await supabase
      .from('forms')
      .select('title, description, slug')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    const title = form?.title || '신청 폼'
    const description = form?.description || '아래 정보를 입력해주세요'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
    const url = `${baseUrl}/form/${slug}`
    const ogImageUrl = `${baseUrl}/form/${slug}/opengraph-image`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        type: 'website',
        siteName: 'AIMAX',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
      alternates: { canonical: url },
    }
  } catch {
    // 폼을 찾지 못한 경우 기본 메타데이터 반환
    return {
      title: '신청 폼',
      description: '아래 정보를 입력해주세요',
    }
  }
}

export default function FormLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
