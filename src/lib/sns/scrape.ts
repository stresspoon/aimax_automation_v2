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
  // 다양한 User-Agent로 시도
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ]
  
  let lastError: Error | null = null
  
  for (const userAgent of userAgents) {
    try {
      const res = await fetch(url, {
        headers: { 
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
      })
      
      if (res.ok) {
        return res.text()
      }
      
      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`)
    } catch (err) {
      lastError = err as Error
      continue
    }
  }
  
  throw lastError || new Error('All fetch attempts failed')
}

// auto-sns.zip에서 검증된 추출 함수들 (적응됨)
function extractInstagramFollowers($: cheerio.CheerioAPI): number | null {
  console.log('인스타그램 팔로워 수 추출 시작...')
  
  // 방법 1: 메타 태그에서 추출
  const descriptions = [
    $('meta[property="og:description"]').attr('content'),
    $('meta[name="description"]').attr('content'),
    $('meta[name="twitter:description"]').attr('content')
  ].filter(Boolean)
  
  for (const desc of descriptions) {
    if (desc) {
      const patterns = [
        /(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*Followers/gi,
        /(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*팔로워/gi,
        /Followers.*?(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)/gi,
        /팔로워.*?(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)/gi
      ]
      
      for (const pattern of patterns) {
        const match = desc.match(pattern)
        if (match) {
          const count = normalizeCompactNumber(match[1])
          if (count && count > 0) {
            console.log(`메타 태그에서 발견: ${count}`)
            return count
          }
        }
      }
    }
  }
  
  // 방법 2: JSON-LD 데이터
  let jsonLdFollowers: number | null = null
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const jsonText = $(el).text()
      const data = JSON.parse(jsonText)
      
      if (data.interactionStatistic) {
        const followers = data.interactionStatistic.userInteractionCount
        if (followers) {
          const count = normalizeCompactNumber(followers.toString())
          if (count && count > 0) {
            console.log(`JSON-LD에서 발견: ${count}`)
            jsonLdFollowers = count
          }
        }
      }
    } catch (e) {
      // JSON 파싱 실패는 무시
    }
  })
  
  if (jsonLdFollowers !== null) {
    return jsonLdFollowers
  }
  
  // 방법 3: 페이지 텍스트에서 정규식으로 추출
  const pageText = $('body').text()
  const textPatterns = [
    /(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*Followers/gi,
    /(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*팔로워/gi,
    /Followers[\s\S]*?(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)/gi,
    /팔로워[\s\S]*?(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)/gi
  ]
  
  for (const pattern of textPatterns) {
    const matches = Array.from(pageText.matchAll(pattern))
    for (const match of matches) {
      const count = normalizeCompactNumber(match[1])
      if (count && count > 0) {
        console.log(`페이지 텍스트에서 발견: ${count}`)
        return count
      }
    }
  }
  
  console.log('인스타그램 팔로워 수를 찾을 수 없음')
  return null
}

function extractThreadsFollowers($: cheerio.CheerioAPI): number | null {
  console.log('Threads 팔로워 수 추출 시작...')
  
  // 방법 1: 메타 태그에서 추출
  const descriptions = [
    $('meta[property="og:description"]').attr('content'),
    $('meta[name="description"]').attr('content'),
    $('meta[name="twitter:description"]').attr('content'),
    $('title').text()
  ].filter(Boolean)
  
  for (const desc of descriptions) {
    if (desc) {
      const patterns = [
        /(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*followers/gi,
        /(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*팔로워/gi,
        /followers.*?(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)/gi,
        /팔로워.*?(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)/gi
      ]
      
      for (const pattern of patterns) {
        const match = desc.match(pattern)
        if (match) {
          const count = normalizeCompactNumber(match[1])
          if (count && count > 0) {
            console.log(`메타 태그에서 발견: ${count}`)
            return count
          }
        }
      }
    }
  }
  
  // 방법 2: 페이지 텍스트에서 정규식으로 추출
  const pageText = $('body').text()
  const textPatterns = [
    /(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*followers/gi,
    /(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*팔로워/gi,
    /followers[\s\S]*?(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)/gi,
    /팔로워[\s\S]*?(\d+(?:,\d{3})*(?:\.\d+)?[KMB]?)/gi
  ]
  
  for (const pattern of textPatterns) {
    const matches = Array.from(pageText.matchAll(pattern))
    for (const match of matches) {
      const count = normalizeCompactNumber(match[1])
      if (count && count > 0) {
        console.log(`페이지 텍스트에서 발견: ${count}`)
        return count
      }
    }
  }
  
  console.log('Threads 팔로워 수를 찾을 수 없음')
  return null
}

function extractBlogFollowers($: cheerio.CheerioAPI): number | null {
  console.log('네이버 블로그 이웃 수 추출 시작...')
  
  // 방법 1: 특정 클래스나 ID에서 추출
  const selectors = [
    '.flick-buddy',
    '.buddy_list',
    '.neighbor_list', 
    '.blogger_buddy',
    '.blog_buddy',
    '[class*="buddy"]',
    '[class*="neighbor"]',
    '#buddy_cnt',
    '.cnt_buddy'
  ]
  
  for (const selector of selectors) {
    const element = $(selector).first()
    if (element.length) {
      const text = element.text()
      const match = text.match(/(\d+(?:,\d{3})*)/)
      if (match) {
        const count = normalizeCompactNumber(match[1])
        if (count && count > 0) {
          console.log(`선택자 ${selector}에서 발견: ${count}`)
          return count
        }
      }
    }
  }
  
  // 방법 2: 페이지 텍스트에서 정규식으로 추출
  const pageText = $('body').text()
  const patterns = [
    /이웃\s*(\d+(?:,\d{3})*)/g,
    /(\d+(?:,\d{3})*)\s*이웃/g,
    /이웃수\s*(\d+(?:,\d{3})*)/g,
    /(\d+(?:,\d{3})*)\s*명.*이웃/g,
    /블로그\s*이웃\s*(\d+(?:,\d{3})*)/g,
    /neighbor\s*(\d+(?:,\d{3})*)/gi
  ]
  
  for (const pattern of patterns) {
    const matches = Array.from(pageText.matchAll(pattern))
    for (const match of matches) {
      const count = normalizeCompactNumber(match[1])
      if (count && count > 0) {
        console.log(`페이지 텍스트에서 발견: ${count}`)
        return count
      }
    }
  }
  
  // 방법 3: 메타 태그와 타이틀에서 추출
  const title = $('title').text()
  const description = $('meta[name="description"]').attr('content') || ''
  const combined = title + ' ' + description
  
  const titleMatch = combined.match(/이웃.*?(\d+(?:,\d{3})*)|(\d+(?:,\d{3})*).*?이웃/)
  if (titleMatch) {
    const numberStr = titleMatch[1] || titleMatch[2]
    if (numberStr) {
      const count = normalizeCompactNumber(numberStr)
      if (count && count > 0) {
        console.log(`타이틀/메타에서 발견: ${count}`)
        return count
      }
    }
  }
  
  console.log('네이버 블로그 이웃 수를 찾을 수 없음')
  return null
}

export async function parseMetrics(url: string): Promise<Metrics> {
  const platform = detectPlatform(url)
  console.log(`Parsing metrics for ${platform}: ${url}`)

  try {
    // 1) Try static fetch first
    let html = await fetchHtml(url)
    let $ = cheerio.load(html)

    if (platform === 'instagram') {
      let followers = extractInstagramFollowers($)
      if (!followers) {
        const proxied = await fetchViaDynamicProxy(url)
        if (proxied) {
          html = proxied
          $ = cheerio.load(html)
          followers = extractInstagramFollowers($)
        }
        if (!followers) {
          const proxiedStatic = await fetchViaProxy(url)
          if (proxiedStatic) {
            html = proxiedStatic
            $ = cheerio.load(html)
            followers = extractInstagramFollowers($)
          }
        }
      }
      return { platform, url, followers, raw: { ogDescription: $('meta[property="og:description"]').attr('content') } }
    }

    if (platform === 'naver_blog') {
      let neighbors = extractBlogFollowers($)
      if (!neighbors) {
        const proxied = await fetchViaProxy(url)
        if (proxied) {
          html = proxied
          $ = cheerio.load(html)
          neighbors = extractBlogFollowers($)
        }
      }
      return { platform, url, neighbors, raw: { pageText: $('body').text().substring(0, 500) } }
    }

    if (platform === 'threads') {
      let followers = extractThreadsFollowers($)
      if (!followers) {
        const proxied = await fetchViaDynamicProxy(url)
        if (proxied) {
          html = proxied
          $ = cheerio.load(html)
          followers = extractThreadsFollowers($)
        }
        if (!followers) {
          const proxiedStatic = await fetchViaProxy(url)
          if (proxiedStatic) {
            html = proxiedStatic
            $ = cheerio.load(html)
            followers = extractThreadsFollowers($)
          }
        }
      }
      return { platform, url, followers, raw: { ogDescription: $('meta[property="og:description"]').attr('content'), title: $('title').text() } }
    }

    return { platform, url }
  } catch (e) {
    console.error(`Error parsing metrics for ${url}:`, e)
    return { platform, url, raw: { error: (e as Error).message } }
  }
}

// Proxy helpers (optional): use when dynamic rendering blocks static scraping
async function fetchViaDynamicProxy(targetUrl: string): Promise<string | null> {
  // 단일 포트 SNS 스크래핑 API 사용
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
  try {
    console.log(`[Proxy] SNS API로 요청: ${targetUrl}`)
    const res = await fetch(`${base}/api/sns/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl }),
      signal: AbortSignal.timeout(30000) // 30초 타임아웃
    })
    if (!res.ok) {
      console.log(`[Proxy] SNS API 응답 실패: ${res.status}`)
      return null
    }
    const data = await res.json()
    console.log(`[Proxy] SNS API 응답 성공, 팔로워: ${data.followers}`)
    return data.html || null
  } catch (err) {
    console.error('[Proxy] SNS API 오류:', err)
    return null
  }
}

async function fetchViaProxy(targetUrl: string): Promise<string | null> {
  // fetchViaDynamicProxy를 사용
  return fetchViaDynamicProxy(targetUrl)
}


