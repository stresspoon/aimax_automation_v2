// 🔧 IMPLEMENTATION_GUIDE.md 가이드대로 정확히 구현
// SNS 팔로워 추출 기능 구현

// 1.1 URL 정규화 함수 (script.js 라인 93-124)
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
  const usernamePattern = /^[a-zA-Z0-9_.]+$/;
  if (usernamePattern.test(trimmedInput)) {
    return `https://www.instagram.com/${trimmedInput}/`;
  }
  
  // 네이버 블로그 ID 패턴
  if (trimmedInput.length > 2 && !trimmedInput.includes('.') && !trimmedInput.includes('@')) {
    return `https://blog.naver.com/${trimmedInput}`;
  }
  
  return trimmedInput;
}

// 1.2 플랫폼 감지 함수 (script.js 라인 126-135)
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

// 1.3 Instagram 추출 (script.js 라인 469-608)
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
      
      // 팔로워 패턴 매칭
      const followerPatterns = [
        /([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/,
        /([\d,]+\.?\d*[KMk]?)\s*팔로워/,
        /팔로워\s*([\d,]+\.?\d*[KMk만천]?)명?/
      ];
      
      for (const fPattern of followerPatterns) {
        const fMatch = content.match(fPattern);
        if (fMatch) {
          let number: any = fMatch[1];
          
          // K, M, 만, 천 처리
          if (typeof number === 'string') {
            if (number.toUpperCase().includes('K')) {
              number = parseFloat(number.replace(/[Kk,]/g, '')) * 1000;
            } else if (number.toUpperCase().includes('M')) {
              number = parseFloat(number.replace(/[Mm,]/g, '')) * 1000000;
            } else if (number.includes('만')) {
              number = parseFloat(number.replace(/[만,]/g, '')) * 10000;
            } else if (number.includes('천')) {
              number = parseFloat(number.replace(/[천,]/g, '')) * 1000;
            } else {
              number = parseInt(number.replace(/,/g, ''));
            }
          }
          
          console.log(`인스타그램 팔로워 수 (meta): ${number}`);
          return parseInt(number) || 0;
        }
      }
    }
  }
  
  // 2. title 속성에서 찾기
  const titlePattern = /title="([\d,]+)"/g;
  let titleMatches: number[] = [];
  let titleMatch;
  while ((titleMatch = titlePattern.exec(html)) !== null) {
    const num = parseInt(titleMatch[1].replace(/,/g, ''));
    if (num > 1000 && num < 100000000) {
      titleMatches.push(num);
    }
  }
  
  if (titleMatches.length > 0) {
    const maxNum = Math.max(...titleMatches);
    console.log(`인스타그램 팔로워 수 (최대 title 값): ${maxNum}`);
    return maxNum;
  }
  
  return 0;
}

// 1.3 Threads 추출 (script.js 라인 610-738)
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
  
  // 2. title 속성에서 정확한 숫자 찾기
  const titlePattern = /title="([\d,]+)"/g;
  let titleMatches: number[] = [];
  let titleMatch;
  while ((titleMatch = titlePattern.exec(html)) !== null) {
    const num = parseInt(titleMatch[1].replace(/,/g, ''));
    if (num > 100 && num < 10000000) {
      titleMatches.push(num);
    }
  }
  
  if (titleMatches.length > 0) {
    const hasFollowerText = html.includes('팔로워') || html.toLowerCase().includes('follower');
    if (hasFollowerText) {
      const maxNum = Math.max(...titleMatches);
      console.log(`Threads 팔로워 수 (title 속성 최대값): ${maxNum}`);
      return maxNum;
    }
  }
  
  return 0;
}

// 1.3 네이버 블로그 추출 (script.js 라인 402-467)
function extractBlogFollowers(html: string): number {
  console.log('네이버 블로그 이웃수 추출 시작...');
  
  // 모바일 네이버 블로그 패턴 먼저 확인
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
      return number;
    }
  }
  
  // 기존 데스크톱 패턴들
  const patterns = [
    /블로그\s*이웃\s*<em[^>]*>([\d,]+)<\/em>/i,
    /이웃\s*<em[^>]*>([\d,]+)<\/em>/i,
    /BuddyMe.*?<em[^>]*>([\d,]+)<\/em>/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const number = parseInt(match[1].replace(/,/g, ''));
      return number;
    }
  }
  
  return 0;
}

// 3.1 메인 처리 함수 - SNS 팔로워 확인 함수
export async function checkSNSFollowers(url: string): Promise<{
  url: string;
  platform: string;
  followers: number;
  status: string;
  minRequirement: number;
  error?: string;
}> {
  const normalizedUrl = normalizeUrl(url);
  const platform = detectPlatform(normalizedUrl);
  
  if (!platform) {
    throw new Error('지원하지 않는 플랫폼입니다.');
  }
  
  try {
    // Playwright 서버 호출 - 기존 server-playwright.js의 /dynamic-proxy 엔드포인트 사용
    const response = await fetch(`http://localhost:3002/dynamic-proxy?url=${encodeURIComponent(normalizedUrl)}`);
    
    if (!response.ok) {
      throw new Error('서버 오류');
    }
    
    const html = await response.text();
    
    let followers = 0;
    if (platform === 'instagram') {
      followers = extractInstagramFollowers(html);
    } else if (platform === 'threads') {
      followers = extractThreadsFollowers(html);
    } else if (platform === 'blog') {
      followers = extractBlogFollowers(html);
    }
    
    // 조건 확인
    const minRequirement = platform === 'instagram' ? 1000 : 
                          platform === 'blog' ? 300 : 500;
    const status = followers >= minRequirement ? '통과' : '미달';
    
    return {
      url: normalizedUrl,
      platform: platform === 'blog' ? '네이버 블로그' : 
                platform === 'instagram' ? '인스타그램' : 'Threads',
      followers: followers,
      status: status,
      minRequirement: minRequirement
    };
  } catch (error) {
    return {
      url: normalizedUrl,
      platform: platform === 'blog' ? '네이버 블로그' : 
                platform === 'instagram' ? '인스타그램' : 'Threads',
      followers: 0,
      status: '오류',
      minRequirement: platform === 'instagram' ? 1000 : 
                      platform === 'blog' ? 300 : 500,
      error: (error as Error).message
    };
  }
}

// 4.1 CSV 파싱 함수 (script.js 라인 829-926)
export function parseGoogleFormSheetCSV(csvText: string): {
  applicants: Array<{
    name: string;
    rowIndex: number;
    sns: {
      threads: string | null;
      instagram: string | null;
      blog: string | null;
    };
  }>;
  urls: string[];
} {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length === 0) return { applicants: [], urls: [] };
  
  // CSV 파싱
  const rows = lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  });
  
  // 열 인덱스 정의 (0부터 시작)
  const nameColumnIndex = 1;       // B열 - 이름
  const threadsColumnIndex = 5;    // F열 - Threads URL
  const instagramColumnIndex = 6;  // G열 - Instagram URL  
  const blogColumnIndex = 7;       // H열 - Blog URL
  
  const applicants = [];
  const urls: string[] = [];
  
  // 첫 번째 행은 헤더로 건너뛰기
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    const name = row[nameColumnIndex] ? row[nameColumnIndex].replace(/^"|"$/g, '').trim() : `지원자${i}`;
    
    const applicant = {
      name: name,
      rowIndex: i,
      sns: { threads: null as string | null, instagram: null as string | null, blog: null as string | null }
    };
    
    // 각 SNS URL 처리
    const snsTypes: Array<'threads' | 'instagram' | 'blog'> = ['threads', 'instagram', 'blog'];
    snsTypes.forEach((snsType, index) => {
      const columnIndex = [threadsColumnIndex, instagramColumnIndex, blogColumnIndex][index];
      const snsUrl = row[columnIndex];
      
      if (snsUrl && snsUrl.trim()) {
        const cleanUrl = snsUrl.replace(/^"|"$/g, '').trim();
        const normalizedUrl = normalizeUrl(cleanUrl);
        if (normalizedUrl && normalizedUrl.startsWith('http')) {
          applicant.sns[snsType] = normalizedUrl;
          urls.push(normalizedUrl);
        }
      }
    });
    
    if (applicant.sns.threads || applicant.sns.instagram || applicant.sns.blog) {
      applicants.push(applicant);
    }
  }
  
  return { applicants, urls };
}

// 5.1 결과 테이블 생성 함수 (UI용 - React 컴포넌트로 변환 필요)
export function createApplicantResultsTable(
  applicants: Array<{
    name: string;
    sns: {
      threads: string | null;
      instagram: string | null;
      blog: string | null;
    };
  }>,
  results: Map<string, {
    followers: number;
    status: string;
    error?: string;
  }>
): {
  tableData: Array<{
    name: string;
    threads: { followers: number; status: string } | null;
    instagram: { followers: number; status: string } | null;
    blog: { followers: number; status: string } | null;
    finalResult: string;
  }>;
} {
  const tableData = applicants.map(applicant => {
    let threadsData = null;
    let instagramData = null;
    let blogData = null;
    
    if (applicant.sns.threads) {
      const result = results.get(applicant.sns.threads);
      if (result) {
        threadsData = {
          followers: result.followers,
          status: result.status
        };
      }
    }
    
    if (applicant.sns.instagram) {
      const result = results.get(applicant.sns.instagram);
      if (result) {
        instagramData = {
          followers: result.followers,
          status: result.status
        };
      }
    }
    
    if (applicant.sns.blog) {
      const result = results.get(applicant.sns.blog);
      if (result) {
        blogData = {
          followers: result.followers,
          status: result.status
        };
      }
    }
    
    // 최종 결과 판단 - 하나라도 통과면 통과
    const finalResult = 
      (threadsData?.status === '통과') ||
      (instagramData?.status === '통과') ||
      (blogData?.status === '통과') ? '통과' : '미달';
    
    return {
      name: applicant.name,
      threads: threadsData,
      instagram: instagramData,
      blog: blogData,
      finalResult
    };
  });
  
  return { tableData };
}