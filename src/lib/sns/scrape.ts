import * as cheerio from 'cheerio'
import { normalizeCompactNumber } from '@/lib/utils'

export interface Metrics {
  platform: 'threads' | 'instagram' | 'naver_blog' | 'unknown'
  url: string
  followers?: number | null
  neighbors?: number | null
  raw?: Record<string, any>
}

export function detectPlatform(url: string): Metrics['platform'] {
  const u = url.toLowerCase()
  if (u.includes('threads.net') || u.includes('threads.com') || u.includes('threads.net')) return 'threads'
  if (u.includes('instagram.com')) return 'instagram'
  if (u.includes('blog.naver.com') || u.includes('m.blog.naver.com')) return 'naver_blog'
  return 'unknown'
}

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

export async function parseMetrics(url: string): Promise<Metrics> {
  const platform = detectPlatform(url)
  try {
    const html = await fetchHtml(url)
    const $ = cheerio.load(html)

    if (platform === 'instagram') {
      // Public profile: try meta tags and fallback to visible text
      const scriptJson = $('script[type="application/ld+json"]').first().text()
      if (scriptJson) {
        try {
          const json = JSON.parse(scriptJson)
          const followers = json?.interactionStatistic?.userInteractionCount
          const parsed = typeof followers === 'string' ? normalizeCompactNumber(followers) : Number(followers)
          if (parsed) return { platform, url, followers: parsed, raw: { ld: json } }
        } catch {}
      }
      const ogTitle = $('meta[property="og:description"]').attr('content') || ''
      const match = ogTitle.match(/([0-9,.]+)\s*(followers|팔로워)/i)
      if (match) {
        const followers = normalizeCompactNumber(match[1])
        return { platform, url, followers }
      }
      return { platform, url, followers: null }
    }

    if (platform === 'naver_blog') {
      // 모바일 페이지가 단순한 편
      const neighborText = $('[class*="buddy"]').first().text() || $('[class*="neighbor"]').first().text()
      let neighbors = neighborText ? normalizeCompactNumber(neighborText) : null
      if (neighbors == null) {
        const htmlText = $.root().text()
        const m = htmlText.match(/이웃[^0-9]*([0-9,.]+)/)
        if (m) neighbors = normalizeCompactNumber(m[1])
      }
      return { platform, url, neighbors, raw: { neighborText } }
    }

    if (platform === 'threads') {
      // Threads는 클라이언트 렌더 케이스가 많음. meta로 시도
      const title = $('title').text()
      const m = title.match(/([0-9,.]+)[\s]?Followers/i)
      const followers = m ? normalizeCompactNumber(m[1]) : null
      return { platform, url, followers }
    }

    return { platform, url }
  } catch (e) {
    return { platform, url }
  }
}


