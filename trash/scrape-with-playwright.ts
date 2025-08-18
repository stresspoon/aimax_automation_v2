// Playwright 서버를 활용한 SNS 메트릭 스크래핑
export async function parseMetricsWithPlaywright(url: string): Promise<{ followers: number; neighbors: number }> {
  try {
    console.log(`[Playwright] 스크래핑 시작: ${url}`)
    
    // Playwright 서버로 동적 콘텐츠 가져오기
    const playwrightUrl = `http://localhost:3002/dynamic-proxy?url=${encodeURIComponent(url)}`
    
    const response = await fetch(playwrightUrl, { 
      signal: AbortSignal.timeout(30000) // 30초 타임아웃
    })
    
    if (!response.ok) {
      console.log('[Playwright] 서버 응답 실패:', response.status)
      throw new Error(`Playwright server error: ${response.status}`)
    }
    
    const html = await response.text()
    console.log(`[Playwright] HTML 가져오기 성공, 길이: ${html.length}`)
    
    // 네이버 블로그
    if (url.includes('blog.naver.com') || url.includes('m.blog.naver.com')) {
      const neighbors = extractBlogNeighbors(html)
      console.log(`[Playwright] 네이버 블로그 이웃 수: ${neighbors}`)
      return { followers: 0, neighbors }
    }
    
    // Instagram
    if (url.includes('instagram.com')) {
      const followers = extractInstagramFollowers(html)
      console.log(`[Playwright] Instagram 팔로워 수: ${followers}`)
      return { followers, neighbors: 0 }
    }
    
    // Threads
    if (url.includes('threads.net') || url.includes('threads.com')) {
      const followers = extractThreadsFollowers(html)
      console.log(`[Playwright] Threads 팔로워 수: ${followers}`)
      return { followers, neighbors: 0 }
    }
    
    console.log('[Playwright] 지원하지 않는 플랫폼')
    return { followers: 0, neighbors: 0 }
  } catch (error) {
    console.error('[Playwright] 스크래핑 에러:', error)
    throw error
  }
}

// auto-sns.zip의 검증된 Instagram 팔로워 추출 로직 (정확히 복사)
function extractInstagramFollowers(html: string): number {
  console.log('[Extract] Instagram 팔로워 추출 시작...')
  
  // 1. Meta 태그에서 찾기 (가장 정확)
  const metaPatterns = [
    /<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i,
    /<meta[^>]*content="([^"]*)"[^>]*property="og:description"/i,
    /<meta[^>]*name="description"[^>]*content="([^"]*)"/i
  ]
  
  for (const pattern of metaPatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      const content = match[1]
      console.log('[Extract] Meta 태그 내용:', content)
      
      // "20.4K Followers", "20,400 Followers", "2.04만 팔로워" 등 다양한 형식 처리
      const followerPatterns = [
        /([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/,
        /([\d,]+\.?\d*[KMk]?)\s*팔로워/,
        /팔로워\s*([\d,]+\.?\d*[KMk만천]?)명?/,
        /([\d]+\.?\d*[KMk])\s*명.*?팔로/
      ]
      
      for (const fPattern of followerPatterns) {
        const fMatch = content.match(fPattern)
        if (fMatch) {
          let numberStr = fMatch[1]
          console.log(`[Extract] 매치된 팔로워 텍스트: "${numberStr}"`)
          
          // K, M, 만, 천 처리
          let number = 0
          if (typeof numberStr === 'string') {
            // K가 포함된 경우 (예: 24K, 2.4K)
            if (numberStr.toUpperCase().includes('K')) {
              const cleanNum = numberStr.replace(/[Kk,]/g, '')
              number = parseFloat(cleanNum) * 1000
              console.log(`[Extract] K 변환: ${cleanNum} * 1000 = ${number}`)
            } 
            // M이 포함된 경우 (예: 1.2M)
            else if (numberStr.toUpperCase().includes('M')) {
              const cleanNum = numberStr.replace(/[Mm,]/g, '')
              number = parseFloat(cleanNum) * 1000000
              console.log(`[Extract] M 변환: ${cleanNum} * 1000000 = ${number}`)
            } 
            // 만이 포함된 경우 (예: 2.4만)
            else if (numberStr.includes('만')) {
              const cleanNum = numberStr.replace(/[만,]/g, '')
              number = parseFloat(cleanNum) * 10000
              console.log(`[Extract] 만 변환: ${cleanNum} * 10000 = ${number}`)
            } 
            // 천이 포함된 경우 (예: 5천)
            else if (numberStr.includes('천')) {
              const cleanNum = numberStr.replace(/[천,]/g, '')
              number = parseFloat(cleanNum) * 1000
              console.log(`[Extract] 천 변환: ${cleanNum} * 1000 = ${number}`)
            } 
            // 쉼표만 있는 경우 (예: 1,234)
            else {
              number = parseInt(numberStr.replace(/,/g, ''))
            }
          }
          
          if (number > 0) {
            console.log(`[Extract] Instagram 팔로워 수 추출 성공: ${Math.floor(number)}`)
            return Math.floor(number)
          }
        }
      }
    }
  }
  
  console.log('[Extract] Instagram 팔로워 수를 찾을 수 없음')
  return 0
}

// auto-sns.zip의 검증된 Threads 팔로워 추출 로직 (정확히 복사)
function extractThreadsFollowers(html: string): number {
  console.log('[Extract] Threads 팔로워 추출 시작...')
  
  // 1. 정확한 패턴: 팔로워 <span title="20,672">2.0만</span>명
  const exactPattern = /팔로워\s*<span[^>]*title="([\d,]+)"[^>]*>[\d.]+[만천]?<\/span>/
  const exactMatch = html.match(exactPattern)
  if (exactMatch) {
    const number = parseInt(exactMatch[1].replace(/,/g, ''))
    console.log(`[Extract] Threads 팔로워 수 (정확한 패턴): ${number}`)
    return number
  }
  
  // 2. Meta 태그에서 팔로워 수 찾기
  const metaPatterns = [
    /<meta[^>]*property="og:description"[^>]*content="([^"]*[Ff]ollowers[^"]*)"/i,
    /<meta[^>]*content="([^"]*[Ff]ollowers[^"]*)"[^>]*property="og:description"/i,
    /<meta[^>]*name="description"[^>]*content="([^"]*[Ff]ollowers[^"]*)"/i,
    /<meta[^>]*content="([^"]*[Ff]ollowers[^"]*)"[^>]*name="description"/i
  ]
  
  for (const pattern of metaPatterns) {
    const match = html.match(pattern)
    if (match) {
      console.log('[Extract] Meta 태그 내용:', match[1])
      // 숫자 추출: "20.5K Followers" 또는 "20,544 Followers" 형태
      const numMatch = match[1].match(/([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/)
      if (numMatch) {
        let numberStr = numMatch[1]
        let number = 0
        
        // K, M 처리
        if (numberStr.includes('K') || numberStr.includes('k')) {
          number = parseFloat(numberStr.replace(/[Kk]/g, '')) * 1000
        } else if (numberStr.includes('M')) {
          number = parseFloat(numberStr.replace('M', '')) * 1000000
        } else {
          number = parseInt(numberStr.replace(/,/g, ''))
        }
        
        console.log(`[Extract] Threads 팔로워 수 (meta): ${number}`)
        return Math.floor(number)
      }
    }
  }
  
  // 3. title 속성에서 정확한 숫자 찾기 (우선순위 높음)
  const titlePattern = /title="([\d,]+)"/g
  let titleMatches: number[] = []
  let titleMatch
  while ((titleMatch = titlePattern.exec(html)) !== null) {
    const num = parseInt(titleMatch[1].replace(/,/g, ''))
    if (num > 100 && num < 10000000) { // 100 이상, 천만 미만
      titleMatches.push(num)
      console.log(`[Extract] title 속성에서 발견: ${titleMatch[1]} -> ${num}`)
    }
  }
  
  // title 속성에서 찾은 값이 있고, 팔로워와 관련된 것으로 보이면 바로 반환
  if (titleMatches.length > 0) {
    // 팔로워 텍스트가 있는지 확인
    const hasFollowerText = html.includes('팔로워') || html.toLowerCase().includes('follower')
    if (hasFollowerText) {
      // 가장 큰 값이 팔로워일 가능성이 높음
      const maxNum = Math.max(...titleMatches)
      console.log(`[Extract] Threads 팔로워 수 (title 속성 최대값): ${maxNum}`)
      return maxNum
    }
  }
  
  console.log('[Extract] Threads 팔로워 수를 찾을 수 없음')
  return 0
}

// auto-sns.zip의 검증된 네이버 블로그 이웃 추출 로직
function extractBlogNeighbors(html: string): number {
  console.log('[Extract] 네이버 블로그 이웃 수 추출 시작...')
  
  // 모바일 네이버 블로그 패턴 먼저 확인
  const mobilePattern = /MOBILE_NAVER_BLOG_FOLLOWERS:\s*([\d,]+)/
  const mobileMatch = html.match(mobilePattern)
  if (mobileMatch) {
    const number = parseInt(mobileMatch[1].replace(/,/g, ''))
    console.log(`[Extract] 모바일 네이버 블로그 이웃 수: ${number}`)
    return number
  }
  
  // 모바일 블로그 HTML 패턴들
  const mobileBlogPatterns = [
    /<span[^>]*class="[^"]*buddy__fw6Uo[^"]*"[^>]*>([\d,]+)명의\s*이웃<\/span>/i,
    />([\d,]+)명의\s*이웃</i,
    /이웃\s*([\d,]+)\s*명/i
  ]
  
  for (const pattern of mobileBlogPatterns) {
    const match = html.match(pattern)
    if (match) {
      const number = parseInt(match[1].replace(/,/g, ''))
      if (number > 0) {
        console.log(`[Extract] 모바일 네이버 블로그 이웃 수 (패턴): ${number}`)
        return number
      }
    }
  }
  
  // 기존 데스크톱 네이버 블로그 이웃수 추출 패턴들
  const patterns = [
    /NAVER_BLOG_FOLLOWERS:\s*([\d,]+)/, // 주입된 마커
    /블로그\s*이웃\s*<em[^>]*>([\d,]+)<\/em>/i,
    /이웃\s*<em[^>]*>([\d,]+)<\/em>/i,
    /BuddyMe.*?<em[^>]*>([\d,]+)<\/em>/i,
    />블로그\s*이웃\s*([\d,]+)/i,
    /이웃\s*([\d,]+)\s*명/i
  ]
  
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      const number = parseInt(match[1].replace(/,/g, ''))
      if (number > 0) {
        console.log(`[Extract] 네이버 블로그 이웃 수 (패턴): ${number}`)
        return number
      }
    }
  }
  
  // <em> 태그 안의 숫자를 찾되, 블로그 이웃과 관련된 것만
  const buddyPattern = /href[^>]*BuddyMe[^>]*>.*?<em[^>]*>([\d,]+)<\/em>/i
  const buddyMatch = html.match(buddyPattern)
  if (buddyMatch) {
    const number = parseInt(buddyMatch[1].replace(/,/g, ''))
    if (number > 0) {
      console.log(`[Extract] 네이버 블로그 이웃 수 (BuddyMe): ${number}`)
      return number
    }
  }
  
  console.log('[Extract] 네이버 블로그 이웃 수를 찾을 수 없음')
  return 0
}