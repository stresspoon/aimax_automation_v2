// 외부 프록시 서비스를 통한 백업 스크래핑 (CORS 우회용)
import { parseMetrics, type Metrics } from './scrape'

// 간단한 CORS 프록시들
const PROXY_SERVICES = [
  'https://api.allorigins.win/get?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://corsproxy.io/?'
]

export async function parseMetricsWithProxy(url: string): Promise<Metrics> {
  // 먼저 직접 스크래핑 시도
  try {
    const result = await parseMetrics(url)
    if (result.followers || result.neighbors) {
      return result
    }
  } catch (error) {
    console.log('Direct scraping failed, trying proxy...')
  }

  // 프록시를 통한 스크래핑 시도
  for (const proxy of PROXY_SERVICES) {
    try {
      console.log(`Trying proxy: ${proxy}`)
      
      if (proxy.includes('allorigins')) {
        // AllOrigins 형식
        const response = await fetch(`${proxy}${encodeURIComponent(url)}`)
        const data = await response.json()
        
        if (data.contents) {
          const result = await parseHtmlContent(url, data.contents)
          if (result.followers || result.neighbors) {
            return result
          }
        }
      } else {
        // 다른 프록시들
        const response = await fetch(`${proxy}${url}`, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        
        if (response.ok) {
          const html = await response.text()
          const result = await parseHtmlContent(url, html)
          if (result.followers || result.neighbors) {
            return result
          }
        }
      }
    } catch (error) {
      console.error(`Proxy ${proxy} failed:`, error)
      continue
    }
  }

  // 모든 방법이 실패한 경우 기본값 반환
  return { platform: 'unknown', url, followers: null, neighbors: null }
}

async function parseHtmlContent(url: string, html: string): Promise<Metrics> {
  const cheerio = await import('cheerio')
  const $ = cheerio.load(html)
  
  const platform = detectPlatform(url)
  
  // 각 플랫폼별로 간단한 패턴 매칭
  if (platform === 'instagram') {
    const pageText = $.root().text()
    const match = pageText.match(/([0-9,.kmb]+)\s*(followers|팔로워)/i)
    const followers = match ? normalizeNumber(match[1]) : null
    return { platform, url, followers }
  }
  
  if (platform === 'naver_blog') {
    const pageText = $.root().text()
    const match = pageText.match(/이웃.*?([0-9,]+)|([0-9,]+).*?이웃/i)
    const neighbors = match ? normalizeNumber(match[1] || match[2]) : null
    return { platform, url, neighbors }
  }
  
  if (platform === 'threads') {
    const pageText = $.root().text()
    const match = pageText.match(/([0-9,.kmb]+)\s*(followers|팔로워)/i)
    const followers = match ? normalizeNumber(match[1]) : null
    return { platform, url, followers }
  }
  
  return { platform, url }
}

function detectPlatform(url: string): 'threads' | 'instagram' | 'naver_blog' | 'unknown' {
  const u = url.toLowerCase()
  if (u.includes('threads.net')) return 'threads'
  if (u.includes('instagram.com')) return 'instagram'  
  if (u.includes('blog.naver.com')) return 'naver_blog'
  return 'unknown'
}

function normalizeNumber(value: string): number | null {
  if (!value) return null
  
  let v = value.trim().replace(/[,\s]/g, '').toLowerCase()
  
  if (v.includes('k')) {
    const num = parseFloat(v.replace('k', ''))
    return Math.round(num * 1000)
  }
  
  if (v.includes('m')) {
    const num = parseFloat(v.replace('m', ''))
    return Math.round(num * 1000000)
  }
  
  const num = parseInt(v, 10)
  return Number.isFinite(num) ? num : null
}