// 🚀 QUICK_SETUP.md 가이드대로 정확히 구현
// auto-sns.zip의 script.js에서 필요한 함수들을 정확히 복사

// 1️⃣ URL 정규화 (script.js 라인 101-132)
function normalizeUrl(input: string): string {
  const trimmedInput = input.trim();
  
  // 이미 전체 URL인 경우 그대로 반환
  if (trimmedInput.startsWith('http://') || trimmedInput.startsWith('https://')) {
    return trimmedInput;
  }
  
  // Threads - @username 또는 username 형태
  if (trimmedInput.startsWith('@')) {
    const username = trimmedInput.substring(1); // @ 제거
    return `https://www.threads.net/@${username}`;
  }
  
  // 아이디만 입력된 경우 패턴 감지
  // 영문자, 숫자, 언더스코어, 점만 포함된 경우를 아이디로 간주
  const usernamePattern = /^[a-zA-Z0-9_.]+$/;
  if (usernamePattern.test(trimmedInput)) {
    // 기본적으로 Instagram으로 간주 (가장 일반적)
    // 사용자가 threads를 원한다면 @를 붙여서 입력하도록 안내
    return `https://www.instagram.com/${trimmedInput}/`;
  }
  
  // 네이버 블로그 ID 패턴 (한글 포함 가능)
  if (trimmedInput.length > 2 && !trimmedInput.includes('.') && !trimmedInput.includes('@')) {
    // 특수문자가 없고 길이가 적당한 경우 네이버 블로그 ID로 간주
    return `https://blog.naver.com/${trimmedInput}`;
  }
  
  // 그 외의 경우 원본 반환 (오류 처리는 나중에)
  return trimmedInput;
}

// 2️⃣ 플랫폼 감지 (script.js 라인 135-143)
function detectPlatform(url: string): string | null {
  if (url.includes('blog.naver.com') || url.includes('m.blog.naver.com')) {
    return 'blog';
  } else if (url.includes('instagram.com')) {
    return 'instagram';
  } else if (url.includes('threads.net') || url.includes('threads.com')) {
    return 'threads';
  }
  return null;
}

// 3️⃣ 인스타그램 추출 (script.js 라인 482-620)
function extractInstagramFollowers(html: string): number {
  console.log('인스타그램 팔로워 추출 시작...');
  
  // 1. Meta 태그에서 찾기 (가장 정확)
  const metaPatterns = [
    /<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i,
    /<meta[^>]*content="([^"]*)"[^>]*property="og:description"/i,
    /<meta[^>]*name="description"[^>]*content="([^"]*)"/i
  ];
  
  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const content = match[1];
      console.log('Meta 태그 내용:', content);
      
      // "20.4K Followers", "20,400 Followers", "2.04만 팔로워" 등 다양한 형식 처리
      const followerPatterns = [
        /([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/,
        /([\d,]+\.?\d*[KMk]?)\s*팔로워/,
        /팔로워\s*([\d,]+\.?\d*[KMk만천]?)명?/,
        /([\d]+\.?\d*[KMk])\s*명.*?팔로/
      ];
      
      for (const fPattern of followerPatterns) {
        const fMatch = content.match(fPattern);
        if (fMatch) {
          let number: any = fMatch[1];
          console.log(`매치된 팔로워 텍스트: "${number}"`);
          
          // K, M, 만, 천 처리
          if (typeof number === 'string') {
            // K가 포함된 경우 (예: 24K, 2.4K)
            if (number.toUpperCase().includes('K')) {
              const cleanNum = number.replace(/[Kk,]/g, '');
              number = parseFloat(cleanNum) * 1000;
              console.log(`K 변환: ${cleanNum} * 1000 = ${number}`);
            } 
            // M이 포함된 경우 (예: 1.2M)
            else if (number.toUpperCase().includes('M')) {
              const cleanNum = number.replace(/[Mm,]/g, '');
              number = parseFloat(cleanNum) * 1000000;
              console.log(`M 변환: ${cleanNum} * 1000000 = ${number}`);
            } 
            // 만이 포함된 경우 (예: 2.4만)
            else if (number.includes('만')) {
              const cleanNum = number.replace(/[만,]/g, '');
              number = parseFloat(cleanNum) * 10000;
              console.log(`만 변환: ${cleanNum} * 10000 = ${number}`);
            } 
            // 천이 포함된 경우 (예: 5천)
            else if (number.includes('천')) {
              const cleanNum = number.replace(/[천,]/g, '');
              number = parseFloat(cleanNum) * 1000;
              console.log(`천 변환: ${cleanNum} * 1000 = ${number}`);
            } 
            // 일반 숫자 (예: 1,234)
            else {
              number = parseInt(number.replace(/,/g, ''));
              console.log(`일반 숫자: ${number}`);
            }
          }
          
          console.log(`인스타그램 팔로워 수 (meta): ${number}`);
          return parseInt(number) || 0;
        }
      }
    }
  }
  
  // 2. 정확한 숫자가 있는 title 속성 찾기
  const titlePattern = /title="([\d,]+)"/g;
  let titleMatches: number[] = [];
  let titleMatch;
  while ((titleMatch = titlePattern.exec(html)) !== null) {
    const num = parseInt(titleMatch[1].replace(/,/g, ''));
    if (num > 1000 && num < 100000000) { // 1천 이상, 1억 미만
      titleMatches.push(num);
      console.log(`title 속성에서 발견: ${titleMatch[1]} -> ${num}`);
    }
  }
  
  // 3. 본문에서 K, M 표기 찾기
  const bodyPatterns = [
    />([\d.]+[KMk])\s*[Ff]ollowers</,
    />([\d.]+[KMk])\s*팔로워</,
    /팔로워\s*<[^>]*>([\d.]+[만천])</,
    />(\d{1,3}(?:,\d{3})*)\s*[Ff]ollowers</,
    />(\d{1,3}(?:,\d{3})*)\s*팔로워</
  ];
  
  for (const pattern of bodyPatterns) {
    const match = html.match(pattern);
    if (match) {
      let number: any = match[1];
      
      if (typeof number === 'string') {
        if (number.includes('K') || number.includes('k')) {
          number = parseFloat(number.replace(/[Kk,]/g, '')) * 1000;
        } else if (number.includes('M')) {
          number = parseFloat(number.replace(/[M,]/g, '')) * 1000000;
        } else if (number.includes('만')) {
          number = parseFloat(number.replace(/[만,]/g, '')) * 10000;
        } else if (number.includes('천')) {
          number = parseFloat(number.replace(/[천,]/g, '')) * 1000;
        } else {
          number = parseInt(number.replace(/,/g, ''));
        }
      }
      
      console.log(`인스타그램 팔로워 수 (본문): ${number}`);
      return parseInt(number) || 0;
    }
  }
  
  // 4. JSON 데이터에서 찾기
  const jsonPatterns = [
    /"follower_count":(\d+)/,
    /"edge_followed_by":\{"count":(\d+)/
  ];
  
  for (const pattern of jsonPatterns) {
    const match = html.match(pattern);
    if (match) {
      const number = parseInt(match[1]);
      console.log(`인스타그램 팔로워 수 (JSON): ${number}`);
      return number;
    }
  }
  
  // 5. title 속성 중 가장 큰 값 (최후의 수단)
  if (titleMatches.length > 0) {
    const maxNum = Math.max(...titleMatches);
    console.log(`인스타그램 팔로워 수 (최대 title 값): ${maxNum}`);
    return maxNum;
  }
  
  console.log('인스타그램 팔로워 수를 찾을 수 없습니다');
  return 0;
}

// 4️⃣ Threads 추출 (script.js 라인 623-738)
function extractThreadsFollowers(html: string): number {
  console.log('Threads HTML 분석 시작...');
  
  // 1. 정확한 패턴: 팔로워 <span title="20,672">2.0만</span>명
  const exactPattern = /팔로워\s*<span[^>]*title="([\d,]+)"[^>]*>[\d.]+[만천]?<\/span>/;
  const exactMatch = html.match(exactPattern);
  if (exactMatch) {
    const number = parseInt(exactMatch[1].replace(/,/g, ''));
    console.log(`Threads 팔로워 수 (정확한 패턴): ${number}`);
    return number;
  }
  
  // 2. Meta 태그에서 팔로워 수 찾기
  const metaPatterns = [
    /<meta[^>]*property="og:description"[^>]*content="([^"]*followers[^"]*)"/i,
    /<meta[^>]*content="([^"]*followers[^"]*)"[^>]*property="og:description"/i,
    /<meta[^>]*name="description"[^>]*content="([^"]*followers[^"]*)"/i,
    /<meta[^>]*content="([^"]*followers[^"]*)"[^>]*name="description"/i
  ];
  
  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    if (match) {
      console.log('Meta 태그 내용:', match[1]);
      // 숫자 추출: "20.5K Followers" 또는 "20,544 Followers" 형태
      const numMatch = match[1].match(/([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/);
      if (numMatch) {
        let number: any = numMatch[1];
        // K, M 처리
        if (number.includes('K') || number.includes('k')) {
          number = parseFloat(number.replace(/[Kk]/g, '')) * 1000;
        } else if (number.includes('M')) {
          number = parseFloat(number.replace('M', '')) * 1000000;
        } else {
          number = parseInt(number.replace(/,/g, ''));
        }
        console.log(`Threads 팔로워 수 (meta): ${number}`);
        return parseInt(number) || 0;
      }
    }
  }
  
  // 3. title 속성에서 정확한 숫자 찾기 (우선순위 높음)
  const titlePattern = /title="([\d,]+)"/g;
  let titleMatches: number[] = [];
  let titleMatch;
  while ((titleMatch = titlePattern.exec(html)) !== null) {
    const num = parseInt(titleMatch[1].replace(/,/g, ''));
    if (num > 100 && num < 10000000) { // 100 이상, 천만 미만
      titleMatches.push(num);
      console.log(`title 속성에서 발견: ${titleMatch[1]} -> ${num}`);
    }
  }
  
  // title 속성에서 찾은 값이 있고, 팔로워와 관련된 것으로 보이면 바로 반환
  if (titleMatches.length > 0) {
    // 팔로워 텍스트가 있는지 확인
    const hasFollowerText = html.includes('팔로워') || html.toLowerCase().includes('follower');
    if (hasFollowerText) {
      // 가장 큰 값이 팔로워일 가능성이 높음
      const maxNum = Math.max(...titleMatches);
      console.log(`Threads 팔로워 수 (title 속성 최대값): ${maxNum}`);
      return maxNum;
    }
  }
  
  console.log('Threads 팔로워 수를 찾을 수 없음');
  return 0;
}

// 5️⃣ 네이버 블로그 추출 (script.js 라인 394-480)
function extractBlogFollowers(html: string): number {
  console.log('네이버 블로그 이웃 수 추출 시작...');
  
  // 모바일 네이버 블로그 특별 패턴
  const mobilePattern = /MOBILE_NAVER_BLOG_FOLLOWERS:\s*([\d,]+)/;
  const mobileMatch = html.match(mobilePattern);
  if (mobileMatch) {
    const number = parseInt(mobileMatch[1].replace(/,/g, ''));
    console.log(`모바일 네이버 블로그 이웃 수: ${number}`);
    return number;
  }
  
  // 모바일 블로그 HTML 패턴들
  const mobileBlogPatterns = [
    /<span[^>]*class="[^"]*buddy__fw6Uo[^"]*"[^>]*>([\d,]+)명의\s*이웃<\/span>/i,
    />([\d,]+)명의\s*이웃</i,
    /이웃\s*([\d,]+)\s*명/i
  ];
  
  for (const pattern of mobileBlogPatterns) {
    const match = html.match(pattern);
    if (match) {
      const number = parseInt(match[1].replace(/,/g, ''));
      console.log(`모바일 네이버 블로그 이웃 수 (패턴): ${number}`);
      return number;
    }
  }
  
  // 기존 데스크톱 네이버 블로그 이웃수 추출 패턴들
  const patterns = [
    /블로그\s*이웃\s*<em[^>]*>([\d,]+)<\/em>/i,  // 블로그 이웃 <em>2,298</em>
    /이웃\s*<em[^>]*>([\d,]+)<\/em>/i,
    /BuddyMe.*?<em[^>]*>([\d,]+)<\/em>/i,  // BuddyMe 링크 내부
    />블로그\s*이웃\s*([\d,]+)/i,
    /이웃\s*([\d,]+)\s*명/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const number = parseInt(match[1].replace(/,/g, ''));
      console.log(`네이버 블로그 이웃 수 (패턴): ${number}`);
      return number;
    }
  }

  // <em> 태그 안의 숫자를 찾되, 블로그 이웃과 관련된 것만
  const buddyPattern = /href[^>]*BuddyMe[^>]*>.*?<em[^>]*>([\d,]+)<\/em>/i;
  const buddyMatch = html.match(buddyPattern);
  if (buddyMatch) {
    const number = parseInt(buddyMatch[1].replace(/,/g, ''));
    console.log(`네이버 블로그 이웃 수 (BuddyMe 링크): ${number}`);
    return number;
  }

  // 가장 큰 em 태그 숫자 찾기 (최후의 수단)
  const emPattern = /<em[^>]*>([\d,]+)<\/em>/g;
  let maxNum = 0;
  let emMatch;
  while ((emMatch = emPattern.exec(html)) !== null) {
    const num = parseInt(emMatch[1].replace(/,/g, ''));
    // 100 ~ 100,000 사이의 숫자 (일반적인 이웃 수 범위)
    if (num > 100 && num < 100000) {
      // "이웃" 텍스트가 근처에 있는지 확인
      const startIndex = Math.max(0, emPattern.lastIndex - 200);
      const endIndex = Math.min(html.length, emPattern.lastIndex + 100);
      const context = html.substring(startIndex, endIndex);
      
      if (context.includes('이웃') || context.includes('BuddyMe')) {
        console.log(`네이버 블로그 이웃 수 (em 태그 근처): ${num}`);
        return num;
      }
      
      // 가장 큰 값 저장
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  if (maxNum > 0) {
    console.log(`네이버 블로그 이웃 수 (최대 em 값): ${maxNum}`);
    return maxNum;
  }

  console.log('네이버 블로그 이웃 수를 찾을 수 없습니다');
  return 0;
}

// 🎯 메인 함수 - 가이드대로 정확히 구현
export async function getSNSFollowers(url: string): Promise<{
  url?: string;
  platform?: string | null;
  followers?: number;
  status?: string;
  minRequirement?: number;
  error?: string;
}> {
  const normalizedUrl = normalizeUrl(url);
  const platform = detectPlatform(normalizedUrl);
  
  if (!platform) return { error: '지원하지 않는 플랫폼' };
  
  try {
    const response = await fetch(`http://localhost:3002/dynamic-proxy?url=${encodeURIComponent(normalizedUrl)}`);
    const html = await response.text();
    
    let followers = 0;
    if (platform === 'instagram') followers = extractInstagramFollowers(html);
    else if (platform === 'threads') followers = extractThreadsFollowers(html);
    else if (platform === 'blog') followers = extractBlogFollowers(html);
    
    const minRequirement = platform === 'instagram' ? 1000 : platform === 'blog' ? 300 : 500;
    
    return {
      url: normalizedUrl,
      platform: platform,
      followers: followers,
      status: followers >= minRequirement ? '통과' : '미달',
      minRequirement: minRequirement
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

// ✨ 사용 예시
// const result = await getSNSFollowers('username123');
// console.log(result); // { platform: 'instagram', followers: 1500, status: '통과' }