// SNS 스크래핑 API - 하나의 포트에서 작동
import { NextRequest, NextResponse } from 'next/server'

// Vercel에서 브라우저 실행을 위해 Node.js 런타임을 강제하고 정적으로 묶이지 않도록 설정
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
import { chromium } from 'playwright-chromium'

// auto-sns.zip script.js의 정확한 추출 로직
function extractInstagramFollowers(html: string): number {
  console.log('인스타그램 팔로워 추출 시작...');
  
  // 0. JavaScript로 추출된 팔로워 수 후보 (최우선 후보지만 메타 값과 비교해 품질 보정)
  let jsExtracted: number | null = null;
  const extractedPattern = /<!-- INSTAGRAM_FOLLOWERS_EXTRACTED: ([\d,]+) -->/;
  const extractedMatch = html.match(extractedPattern);
  if (extractedMatch) {
    jsExtracted = parseInt(extractedMatch[1].replace(/,/g, '')) || null;
    console.log(`✅ 인스타그램 팔로워 수 (JS 추출 후보): ${jsExtracted ?? 'null'}`);
  }
  
  // 0-1. HTML에 직접 숫자가 있는 경우 (새로운 Instagram 형식)
  // <span title="9,706">9,706</span> 형식
  const spanTitlePattern = /<span[^>]*title="([\d,]+)"[^>]*>[\d,\.]+[KMk만천]?<\/span>/g;
  let spanMatch;
  let spanTitleCandidate: number | null = null;
  while ((spanMatch = spanTitlePattern.exec(html)) !== null) {
    const text = html.substring(Math.max(0, spanMatch.index - 100), spanMatch.index + 200);
    if (text.includes('팔로워') || text.toLowerCase().includes('follower')) {
      const number = parseInt(spanMatch[1].replace(/,/g, ''));
      console.log(`✅ 인스타그램 팔로워 수 (span title): ${number}`);
      spanTitleCandidate = number;
      break;
    }
  }
  
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
            if (number.toUpperCase().includes('K')) {
              const cleanNum = number.replace(/[Kk,]/g, '');
              number = parseFloat(cleanNum) * 1000;
            } else if (number.toUpperCase().includes('M')) {
              const cleanNum = number.replace(/[Mm,]/g, '');
              number = parseFloat(cleanNum) * 1000000;
            } else if (number.includes('만')) {
              const cleanNum = number.replace(/[만,]/g, '');
              number = parseFloat(cleanNum) * 10000;
            } else if (number.includes('천')) {
              const cleanNum = number.replace(/[천,]/g, '');
              number = parseFloat(cleanNum) * 1000;
            } else {
              number = parseInt(number.replace(/,/g, ''));
            }
          }
          
          const metaNum = parseInt(number) || 0;
          console.log(`인스타그램 팔로워 수 (meta): ${metaNum}`);
          // 메타가 유효하면 즉시 반환하지 말고 최종 비교에 사용
          // 아래에서 jsExtracted, spanTitleCandidate와 함께 최대값 선택
          const candidates = [jsExtracted, spanTitleCandidate, metaNum].filter((v): v is number => typeof v === 'number' && !isNaN(v));
          if (candidates.length > 0) {
            return Math.max(...candidates);
          }
          return metaNum;
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
      console.log(`title 속성에서 발견: ${titleMatch[1]} -> ${num}`);
    }
  }
  
  const candidates = [jsExtracted, spanTitleCandidate, ...(titleMatches.length ? [Math.max(...titleMatches)] : [])].filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (candidates.length > 0) {
    const best = Math.max(...candidates);
    console.log(`인스타그램 팔로워 수 (최종 선택): ${best}`);
    return best;
  }
  
  return 0;
}

function extractThreadsFollowers(html: string): number {
  console.log('=== Threads 팔로워 추출 시작 ===');
  console.log('HTML 길이:', html.length);
  
  // 디버그: HTML에 threads 관련 텍스트가 있는지 확인
  if (html.includes('threads.net')) {
    console.log('✓ threads.net 텍스트 발견');
  }
  if (html.includes('Followers') || html.includes('followers')) {
    console.log('✓ Followers 텍스트 발견');
  }
  if (html.includes('팔로워')) {
    console.log('✓ 팔로워 텍스트 발견');
  }
  
  // 1. 정확한 패턴: 팔로워 <span title="20,672">2.0만</span>명
  console.log('[패턴1] 정확한 한글 패턴 검색 중...');
  // 더 유연한 패턴: 다양한 span 속성 순서를 처리
  const exactPatterns = [
    /팔로워\s*<span[^>]*title="([\d,]+)"[^>]*>[\d.]+[만천]?<\/span>/,
    /<span[^>]*title="([\d,]+)"[^>]*>[\d.]+[만천]?<\/span>\s*명/,
    /팔로워[\s\S]*?<span[^>]*title="([\d,]+)"[^>]*>[^<]+<\/span>\s*명/
  ];
  
  for (const pattern of exactPatterns) {
    const exactMatch = html.match(pattern);
    if (exactMatch) {
      const number = parseInt(exactMatch[1].replace(/,/g, ''));
      console.log(`✅ Threads 팔로워 수 (정확한 패턴): ${number}`);
      return number;
    }
  }
  console.log('❌ 정확한 패턴 못 찾음');
  
  // 1-1. JavaScript로 추출한 데이터 확인
  console.log('[패턴1-1] JavaScript 추출 데이터 확인...');
  const extractedPattern = /<!-- THREADS_FOLLOWERS_EXTRACTED: ([\d,]+) -->/;
  const extractedMatch = html.match(extractedPattern);
  if (extractedMatch) {
    const number = parseInt(extractedMatch[1].replace(/,/g, ''));
    console.log(`✅ Threads 팔로워 수 (JS 추출): ${number}`);
    return number;
  }
  console.log('❌ JS 추출 데이터 없음');
  
  // 2. Meta 태그에서 팔로워 수 찾기
  console.log('[패턴2] Meta 태그에서 검색 중...');
  const metaPatterns = [
    /<meta[^>]*property="og:description"[^>]*content="([^"]*[Ff]ollowers[^"]*)"/i,
    /<meta[^>]*content="([^"]*[Ff]ollowers[^"]*)"[^>]*property="og:description"/i,
    /<meta[^>]*name="description"[^>]*content="([^"]*[Ff]ollowers[^"]*)"/i,
    /<meta[^>]*content="([^"]*[Ff]ollowers[^"]*)"[^>]*name="description"/i
  ];
  
  for (let i = 0; i < metaPatterns.length; i++) {
    const pattern = metaPatterns[i];
    const match = html.match(pattern);
    if (match) {
      console.log(`  Meta 태그 패턴 ${i+1} 매치:`, match[1].substring(0, 100));
      // 숫자 추출: "20.5K Followers" 또는 "20,544 Followers" 형태
      const numMatch = match[1].match(/([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/);
      if (numMatch) {
        let number: any = numMatch[1];
        console.log(`  추출된 숫자 문자열: "${number}"`);
        // K, M 처리
        if (number.includes('K') || number.includes('k')) {
          number = parseFloat(number.replace(/[Kk]/g, '')) * 1000;
        } else if (number.includes('M')) {
          number = parseFloat(number.replace('M', '')) * 1000000;
        } else {
          number = parseInt(number.replace(/,/g, ''));
        }
        console.log(`✅ Threads 팔로워 수 (meta): ${number}`);
        return parseInt(number) || 0;
      } else {
        console.log('  숫자 패턴 못 찾음');
      }
    }
  }
  console.log('❌ Meta 태그에서 못 찾음');
  
  // 3. title 속성에서 정확한 숫자 찾기 (우선순위 높음)
  console.log('[패턴3] title 속성에서 검색 중...');
  const titlePattern = /title="([\d,]+)"/g;
  let titleMatches: number[] = [];
  let titleMatch;
  let titleCount = 0;
  while ((titleMatch = titlePattern.exec(html)) !== null) {
    titleCount++;
    const num = parseInt(titleMatch[1].replace(/,/g, ''));
    console.log(`  title 속성 발견 #${titleCount}: "${titleMatch[1]}" -> ${num}`);
    if (num > 100 && num < 10000000) {
      titleMatches.push(num);
      console.log(`    ✓ 유효한 범위 (100 ~ 10,000,000)`);
    } else {
      console.log(`    ✗ 범위 밖 숫자`);
    }
  }
  
  if (titleMatches.length > 0) {
    console.log(`  총 ${titleMatches.length}개의 유효한 title 숫자 발견:`, titleMatches);
    const hasFollowerText = html.includes('팔로워') || html.toLowerCase().includes('follower');
    console.log(`  팔로워 텍스트 존재 여부: ${hasFollowerText}`);
    if (hasFollowerText) {
      const maxNum = Math.max(...titleMatches);
      console.log(`✅ Threads 팔로워 수 (title 속성 최대값): ${maxNum}`);
      return maxNum;
    } else {
      console.log('  ❌ 팔로워 텍스트가 없어서 title 값 무시');
    }
  } else {
    console.log('❌ title 속성에서 유효한 숫자 못 찾음');
  }
  
  // 4. 디버그: HTML 샘플 출력
  console.log('\n[디버그] HTML 샘플 (처음 500자):');
  console.log(html.substring(0, 500));
  
  // Meta 태그 부분만 추출해서 보기
  const metaSection = html.match(/<head[^>]*>[\s\S]*?<\/head>/i);
  if (metaSection) {
    console.log('\n[디버그] <head> 태그 내용 (처음 1000자):');
    console.log(metaSection[0].substring(0, 1000));
  }
  
  console.log('\n❌❌❌ Threads 팔로워 수를 찾을 수 없음 - 0 반환');
  return 0;
}

function extractBlogFollowers(html: string): number {
  console.log('=== 네이버 블로그 이웃수 추출 시작 ===');
  console.log('HTML 길이:', html.length);
  
  // 디버그: 블로그 관련 텍스트 확인
  if (html.includes('blog.naver.com')) {
    console.log('✓ blog.naver.com 텍스트 발견');
  }
  if (html.includes('이웃')) {
    console.log('✓ "이웃" 텍스트 발견');
  }
  if (html.includes('BuddyMe')) {
    console.log('✓ BuddyMe 텍스트 발견');
  }
  
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
      console.log(`모바일 네이버 블로그 이웃 수 (패턴): ${number}`);
      return number;
    }
  }
  
  // 기존 데스크톱 패턴들
  const patterns = [
    /블로그\s*이웃\s*<em[^>]*>([\d,]+)<\/em>/i,
    /이웃\s*<em[^>]*>([\d,]+)<\/em>/i,
    /BuddyMe.*?<em[^>]*>([\d,]+)<\/em>/i,
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

// URL 정규화 함수
function normalizeUrl(input: string): string {
  if (!input) return input;
  
  const trimmed = input.trim();
  
  // 이미 완전한 URL인 경우
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  // @로 시작하는 경우 제거
  const username = trimmed.startsWith('@') ? trimmed.substring(1) : trimmed;
  
  // 플랫폼 추측 (threads, instagram, blog)
  // 기본적으로 threads로 가정 (가장 많이 사용)
  // 추후 필요시 플랫폼 힌트를 받을 수 있도록 확장 가능
  
  // 네이버 블로그 패턴 체크 (점이나 특수문자 없는 짧은 ID)
  if (username.includes('blog') || username.includes('naver')) {
    return `https://blog.naver.com/${username.replace('blog.naver.com/', '').replace('https://', '')}`;
  }
  
  // Instagram 패턴 체크 (ig, insta 포함)
  if (username.toLowerCase().includes('instagram') || username.toLowerCase().includes('ig.')) {
    return `https://www.instagram.com/${username.replace('instagram.com/', '').replace('https://', '')}`;
  }
  
  // 기본값: Threads (가장 흔한 케이스) - threads.com 도메인 사용
  return `https://www.threads.com/@${username}`;
}

export async function POST(req: NextRequest) {
  const { url: rawUrl } = await req.json();
  
  console.log('\n========================================');
  console.log('[SNS Scrape API] 요청 받음');
  console.log('원본 입력:', rawUrl);
  
  if (!rawUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }
  
  // URL 정규화
  const url = normalizeUrl(rawUrl);
  console.log('정규화된 URL:', url);
  console.log('시간:', new Date().toISOString());
  console.log('========================================\n');
  
  let browser = null;
  
  try {
    console.log(`[SNS Scrape API] Playwright로 동적 콘텐츠 가져오기 시작...`);
    
    // 브라우저 실행 (Vercel 환경 대응)
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ko-KR'
    });
    
    const page = await context.newPage();
    
    // 페이지 로드 - domcontentloaded로 변경 (더 빠름)
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',  // networkidle 대신 DOM 로드만 기다림
      timeout: 15000  // 타임아웃도 줄임
    });
    
    // 짧은 대기 (필수 요소만 로딩)
    await page.waitForTimeout(1500);
    
    let finalHtml = null;
    
    // Instagram 특별 처리 - 동적 추출
    if (url.includes('instagram.com')) {
      console.log('[Instagram] 팔로워 정보 추출 시작...');
      try {
        // 페이지 완전 로드 대기
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000); // 추가 대기
        
        const followerData = await page.evaluate(() => {
          // 디버그: 페이지 URL 확인
          console.log('[Instagram Debug] Current URL:', window.location.href);
          
          // 1. 제공된 정확한 셀렉터로 찾기
          const exactSelector = 'section > main > div > div > header > section > ul > li:nth-child(2) > div > a > span';
          const exactElement = document.querySelector(exactSelector);
          console.log('[Instagram Debug] Exact selector element found:', !!exactElement);
          
          if (exactElement) {
            console.log('[Instagram Debug] Exact element text:', exactElement.textContent);
            console.log('[Instagram Debug] Exact element HTML:', exactElement.innerHTML);
            
            // span 내부의 span[title] 찾기
            const titleSpan = exactElement.querySelector('span[title]') as HTMLSpanElement | null;
            if (titleSpan) {
              const title = titleSpan.getAttribute('title');
              console.log('[Instagram Debug] Title attribute:', title);
              if (title && /^\d{1,3}(,\d{3})*$/.test(title)) {
                console.log(`[정확한 셀렉터] 팔로워 발견: ${title}`);
                return { followers: title, method: 'exact-selector', debug: { elementText: exactElement.textContent } };
              }
            }
            // title이 없는 경우 숫자 텍스트 직접 찾기
            const text = exactElement.textContent?.trim() || '';
            const match = text.match(/(\d{1,3}(?:,\d{3})*)/);
            if (match) {
              console.log(`[정확한 셀렉터 텍스트] 팔로워 발견: ${match[1]}`);
              return { followers: match[1], method: 'exact-selector-text', debug: { elementText: text } };
            }
          }

          // 1-보강: 사용자가 제공한 긴 경로 셀렉터 시도 (가장 깊은 span)
          const providedPath = '#mount_0_0_4S > div > div > div.x9f619.x1n2onr6.x1ja2u2z > div > div > div.x78zum5.xdt5ytf.x1t2pt76.x1n2onr6.x1ja2u2z.x10cihs4 > div.html-div.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x9f619.x16ye13r.xvbhtw8.x78zum5.x15mokao.x1ga7v0g.x16uus16.xbiv7yw.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.x1q0g3np.xqjyukv.x1qjc9v5.x1oa3qoh.x1qughib > div.xvc5jky.xh8yej3.x10o80wk.x14k21rp.x17snn68.x6osk4m.x1porb0y.x8vgawa > section > main > div > div > header > section.xc3tme8.x1xdureb.x18wylqe.x13vxnyz.xvxrpd7 > ul > li:nth-child(2) > div > a > span > span > span';
          const providedEl = document.querySelector(providedPath) as HTMLElement | null;
          if (providedEl) {
            const titleAttr = providedEl.getAttribute('title');
            if (titleAttr && /^\d{1,3}(,\d{3})*$/.test(titleAttr)) {
              return { followers: titleAttr, method: 'provided-selector-title' } as const;
            }
            const innerTitle = providedEl.querySelector('span[title]') as HTMLSpanElement | null;
            const inner = innerTitle?.getAttribute('title') || '';
            if (inner && /^\d{1,3}(,\d{3})*$/.test(inner)) {
              return { followers: inner, method: 'provided-selector-inner-title' } as const;
            }
            const t = (providedEl.textContent || '').trim();
            const m = t.match(/(\d{1,3}(?:,\d{3})*)/);
            if (m) {
              return { followers: m[1], method: 'provided-selector-text' } as const;
            }
          }
          
          // 2. 팔로워 텍스트가 있는 링크에서 찾기
          const links = document.querySelectorAll('a[href*="/followers"]');
          console.log('[Instagram Debug] Followers links found:', links.length);
          for (const link of links) {
            console.log('[Instagram Debug] Link text:', link.textContent);
            const titleSpan = link.querySelector('span[title]') as HTMLSpanElement | null;
            if (titleSpan) {
              const title = titleSpan.getAttribute('title');
              console.log('[Instagram Debug] Link title attribute:', title);
              if (title && /^\d{1,3}(,\d{3})*$/.test(title)) {
                console.log(`[followers 링크] 팔로워 발견: ${title}`);
                return { followers: title, method: 'followers-link', debug: { linkText: link.textContent } };
              }
            }
          }
          
          // 3. 모든 span[title] 검색
          const spans = document.querySelectorAll('span[title]');
          console.log('[Instagram Debug] Total span[title] elements:', spans.length);
          
          // 처음 10개만 디버그 출력
          for (let i = 0; i < Math.min(10, spans.length); i++) {
            const span = spans[i];
            const title = span.getAttribute('title');
            console.log(`[Instagram Debug] Span ${i} title:`, title, 'text:', span.textContent);
            
            if (title && /^\d{1,3}(,\d{3})*$/.test(title)) {
              const parent = span.parentElement;
              if (parent && (parent.textContent?.includes('팔로워') || parent.textContent?.toLowerCase().includes('follower'))) {
                console.log(`[일반 span] 팔로워 발견: ${title}`);
                return { followers: title, method: 'general-span', debug: { parentText: parent.textContent } };
              }
            }
          }
          
          // 디버그: 페이지에 "팔로워" 또는 "follower" 텍스트가 있는지 확인
          const bodyText = document.body.innerText || '';
          const hasFollowerText = bodyText.includes('팔로워') || bodyText.toLowerCase().includes('follower');
          console.log('[Instagram Debug] Page has follower text:', hasFollowerText);
          
          return null;
        });
        
        if (followerData) {
          console.log(`[Instagram] 동적 추출 성공:`, followerData);
          const partialHtml = await page.content();
          finalHtml = partialHtml + `\n<!-- INSTAGRAM_FOLLOWERS_EXTRACTED: ${followerData.followers} -->`;
        } else {
          console.log('[Instagram] 동적 추출 실패, 전체 HTML 사용');
          // 전체 HTML 가져오기
          finalHtml = await page.content();
        }
      } catch (e) {
        console.log('[Instagram] 추출 오류:', e);
      }
    }
    
    // Threads 특별 처리 - 빠른 추출
    else if (url.includes('threads.net') || url.includes('threads.com')) {
      console.log('[Threads] 팔로워 정보 빠른 추출 시작...');
      try {
        // 팔로워 정보만 빠르게 찾기 (최대 3초)
        type ThreadsFollowerData = { followers: string; method: string } | null
        const followerData: ThreadsFollowerData = await Promise.race([
          // 메인 추출 로직
          (async (): Promise<ThreadsFollowerData> => {
            // span[title] 요소가 나타날 때까지 최대 3초 대기
            await page.waitForLoadState('domcontentloaded').catch(() => {});
            await page.waitForTimeout(400);
            await page.waitForSelector('span[title]', { timeout: 3000 }).catch(() => {});
            // 상단으로 스크롤(안전)
            await page.evaluate(() => window.scrollTo(0, 0));
            
            // JavaScript로 직접 팔로워 수 추출
            return await page.evaluate(() => {
              // 1. 가장 정확한 방법: 특정 클래스 조합으로 찾기
              // 팔로워가 있는 컨테이너 찾기
              const containers = document.querySelectorAll('div.x78zum5.x2lah0s');
              for (const container of containers) {
                // 컨테이너 내에서 span > span 구조 찾기
                const spans = container.querySelectorAll('span > span[title]');
                for (const span of spans) {
                  const title = span.getAttribute('title');
                  // 천 단위 구분자가 있는 숫자 형식 확인
                  if (title && /^\d{1,3}(,\d{3})*$/.test(title)) {
                    // 부모의 텍스트 확인
                    const parent = span.parentElement;
                    if (parent && (parent.textContent?.includes('팔로워') || parent.textContent?.includes('Follower'))) {
                      console.log(`[정확한 셀렉터] 팔로워 발견: ${title}`);
                      return { followers: title, method: 'exact-selector' } as const;
                    }
                  }
                }
              }

              // 1-보강: 제공된 정확한 셀렉터로 찾기
              // #barcelona-page-layout > div > div > div.xb57i2i... > div.x78zum5... > div.x1a8lsjc... > div.x6s0dn4... > div.x78zum5.x2lah0s > div > div > span
              const layoutRoot = document.querySelector('#barcelona-page-layout');
              if (layoutRoot) {
                // 제공된 셀렉터 패턴으로 직접 찾기
                const followerSpan = layoutRoot.querySelector('div.x78zum5.x2lah0s > div > div > span') as HTMLSpanElement | null;
                if (followerSpan) {
                  // span 내부의 span[title] 찾기
                  const titleSpan = followerSpan.querySelector('span[title]') as HTMLSpanElement | null;
                  if (titleSpan) {
                    const titleAttr = titleSpan.getAttribute('title');
                    if (titleAttr && /^\d{1,3}(,\d{3})*$/.test(titleAttr)) {
                      // 팔로워 텍스트 확인
                      const parentText = followerSpan.textContent || '';
                      if (parentText.includes('팔로워') || parentText.toLowerCase().includes('follower')) {
                        console.log(`[정확한 레이아웃 셀렉터] 팔로워 발견: ${titleAttr}`);
                        return { followers: titleAttr, method: 'exact-layout-selector' } as const;
                      }
                    }
                  }
                }
                
                // 폴백: 더 간단한 경로로 시도
                const candidate = layoutRoot.querySelector('div.x2lah0s span[title]') as HTMLSpanElement | null;
                const titleAttr = candidate ? candidate.getAttribute('title') : '';
                if (titleAttr && /^\d{1,3}(,\d{3})*$/.test(titleAttr)) {
                  const parentText = candidate?.parentElement?.textContent || '';
                  if (parentText.includes('팔로워') || parentText.toLowerCase().includes('follower')) {
                    console.log(`[레이아웃 폴백] 팔로워 발견: ${titleAttr}`);
                    return { followers: titleAttr, method: 'layout-fallback' } as const;
                  }
                }
              }
              
              // 2. 백업: XPath로 팔로워 요소 직접 찾기
              const xpath = "//span[contains(text(),'팔로워')]/span[@title]";
              const xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
              if (xpathResult.singleNodeValue) {
                const span = xpathResult.singleNodeValue as HTMLElement;
                const title = span.getAttribute('title');
                if (title && /^\d{1,3}(,\d{3})*$/.test(title)) {
                  console.log(`[XPath] 팔로워 발견: ${title}`);
                  return { followers: title, method: 'xpath' } as const;
                }
              }
              
              // 3. 최후의 수단: span[title] 직접 검색
              const followerElements = document.querySelectorAll('span[title]');
              for (let i = 0; i < Math.min(followerElements.length, 10); i++) {
                const span = followerElements[i];
                const title = span.getAttribute('title');
                if (title && /^\d{1,3}(,\d{3})*$/.test(title)) {
                  // 부모가 span이고 "팔로워" 텍스트 포함 확인
                  const parent = span.parentElement;
                  if (parent && parent.tagName === 'SPAN' && 
                      (parent.textContent?.includes('팔로워') || parent.textContent?.includes('Follower'))) {
                    console.log(`[Fallback] 팔로워 발견: ${title}`);
                    return { followers: title, method: 'fallback' } as const;
                  }
                }
              }
              
              return null;
            }) as unknown as ThreadsFollowerData;
          })(),
          
          // 3초 타임아웃
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000))
        ]);
        
        if (followerData) {
          console.log(`[Threads] 빠른 추출 성공:`, followerData);
          // 필요한 부분만 가져오기
          const partialHtml = await page.evaluate(() => {
            const head = document.head?.outerHTML || '';
            const bodyText = document.body?.innerText?.substring(0, 5000) || '';
            return head + bodyText;
          });
          finalHtml = partialHtml + `\n<!-- THREADS_FOLLOWERS_EXTRACTED: ${followerData.followers} -->`;
        } else {
          console.log('[Threads] 빠른 추출 실패, 기본 HTML 사용');
        }
      } catch (e) {
        console.log('[Threads] 추출 오류:', e);
      }
    }
    
    // 네이버 블로그 특별 처리
    if (url.includes('blog.naver.com') || url.includes('m.blog.naver.com')) {
      console.log('[네이버 블로그] 이웃수 추출 시작...');
      
      if (url.includes('m.blog.naver.com')) {
        // 모바일 블로그 처리 (iframe 없음): 고정 셀렉터 기반 단순화
        try {
          // 네트워크 안정화 대기 (요청 스펙 반영)
          await page.waitForLoadState('networkidle').catch(() => {})
          await page.waitForSelector('.buddy__fw6Uo', { timeout: 10000 });
          await page.waitForTimeout(500);

          const followerCount = await page.evaluate(() => {
            const element = document.querySelector('.buddy__fw6Uo');
            if (element) {
              const text = element.textContent?.trim() || '';
              const match = text.match(/(\d{1,3}(?:,\d{3})*)\s*명/);
              if (match) {
                return match[1];
              }
            }
            return null;
          });

          if (followerCount) {
            console.log(`[모바일 블로그] 이웃수 발견: ${followerCount}`);
            const mobileHtml = await page.content();
            finalHtml = mobileHtml + `\n<!-- MOBILE_NAVER_BLOG_FOLLOWERS: ${followerCount} -->`;
          } else {
            finalHtml = await page.content();
          }
        } catch (e) {
          console.log('[모바일 블로그] 추출 실패:', e);
          finalHtml = await page.content();
        }
      } else {
        // 데스크톱 블로그 iframe 처리
        try {
          console.log('[데스크톱 블로그] iframe 대기 중...');
          // 네트워크 안정화 대기 (요청 스펙 반영)
          await page.waitForLoadState('networkidle').catch(() => {})
          
          // iframe이 로드될 때까지 대기
          await page.waitForSelector('#mainFrame', { timeout: 10000 });
          const frameHandle = await page.$('#mainFrame');
          
          if (!frameHandle) {
            throw new Error('iframe을 찾을 수 없습니다');
          }
          
          const frame = await frameHandle.contentFrame();
          
          if (!frame) {
            throw new Error('iframe 컨텐츠에 접근할 수 없습니다');
          }
          
          console.log('[데스크톱 블로그] iframe 접근 성공');
          
          // iframe 내부 콘텐츠 로드 대기
          await frame.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(2000); // 추가 대기
              
          // iframe 내부에서 이웃 수 추출
          const followerInfo = await frame.evaluate(() => {
            console.log('[iframe] 이웃수 추출 시작');
            
            // 방법 1: BuddyMe 링크 내부의 em 태그
            const buddyLink = document.querySelector('a[href*="BuddyMe"] em');
            if (buddyLink) {
              const text = buddyLink.textContent?.trim() || '';
              console.log(`[iframe] BuddyMe 링크에서 발견: "${text}"`);
              if (/^\d{1,3}(,\d{3})*$/.test(text)) {
                return { count: text, method: 'BuddyMe-link' };
              }
            }
            
            // 방법 2: li.cm-col1 내부에서 찾기
            const cmCol1Li = document.querySelector('li.cm-col1');
            if (cmCol1Li && cmCol1Li.textContent?.includes('블로그 이웃')) {
              const em = cmCol1Li.querySelector('em');
              if (em) {
                const text = em.textContent?.trim().replace(/\s+/g, '') || '';
                console.log(`[iframe] cm-col1에서 발견: "${text}"`);
                if (/^\d{1,3}(,\d{3})*$/.test(text)) {
                  return { count: text, method: 'cm-col1' };
                }
              }
            }
            
            // 방법 3: 이웃 텍스트가 있는 요소의 em 태그
            const allEms = document.querySelectorAll('em');
            for (const em of allEms) {
              const parent = em.parentElement;
              if (parent && parent.textContent?.includes('이웃')) {
                const text = em.textContent?.trim() || '';
                if (/^\d{1,3}(,\d{3})*$/.test(text)) {
                  console.log(`[iframe] 이웃 근처 em에서 발견: "${text}"`);
                  return { count: text, method: 'neighbor-em' };
                }
              }
            }
                
            
            console.log('[iframe] 이웃수를 찾을 수 없음');
            return null;
          });
          
          if (followerInfo) {
            console.log(`[데스크톱 블로그] 이웃수 발견: ${followerInfo.count} (방법: ${followerInfo.method})`);
            const frameHtml = await frame.content();
            finalHtml = frameHtml + 
              `\n<!-- NAVER_BLOG_FOLLOWERS: ${followerInfo.count} -->`;
          } else {
            console.log('[데스크톱 블로그] iframe에서 이웃수 못 찾음');
            finalHtml = await frame.content();
          }
        } catch (e) {
          console.log('[데스크톱 블로그] 추출 실패:', e);
          finalHtml = await page.content();
        }
      }
    }
    
    const html = finalHtml || await page.content();
    await browser.close();
    
    console.log(`[SNS Scrape API] HTML 가져오기 완료. 길이: ${html.length}`);
    
    // 플랫폼 감지 및 팔로워 추출
    let platform = '';
    let followers = 0;
    
    if (url.includes('instagram.com')) {
      platform = 'instagram';
      console.log('[SNS Scrape API] Instagram 감지 - 팔로워 추출 시작');
      followers = extractInstagramFollowers(html);
    } else if (url.includes('threads.net') || url.includes('threads.com')) {
      platform = 'threads';
      console.log('[SNS Scrape API] Threads 감지 - 팔로워 추출 시작');
      followers = extractThreadsFollowers(html);
    } else if (url.includes('blog.naver.com') || url.includes('m.blog.naver.com')) {
      platform = 'naver_blog';
      console.log('[SNS Scrape API] 네이버 블로그 감지 - 이웃 추출 시작');
      followers = extractBlogFollowers(html);
    } else {
      console.log('[SNS Scrape API] ⚠️ 알 수 없는 플랫폼:', url);
    }
    
    console.log('\n========================================');
    console.log(`[SNS Scrape API] 최종 결과`);
    console.log(`플랫폼: ${platform}`);
    console.log(`팔로워: ${followers}`);
    console.log('========================================\n');
    
    // 실패 원인 분석
    let failureReason = null;
    let extractionAttempts: any[] = [];
    
    if (followers === 0) {
      // 실패 원인 분석
      if (platform === 'instagram') {
        // Instagram 실패 원인
        const hasMetaTag = html.includes('og:description');
        const hasFollowerText = html.includes('follower') || html.includes('Follower') || html.includes('팔로워');
        const hasTitleAttribute = html.includes('title="');
        
        extractionAttempts.push({
          method: 'meta_tag',
          found: hasMetaTag,
          detail: hasMetaTag ? 'Meta 태그는 있지만 팔로워 수를 추출할 수 없음' : 'Meta 태그 없음'
        });
        
        extractionAttempts.push({
          method: 'title_attribute',
          found: hasTitleAttribute,
          detail: hasTitleAttribute ? 'title 속성은 있지만 유효한 숫자를 찾을 수 없음' : 'title 속성 없음'
        });
        
        extractionAttempts.push({
          method: 'follower_text',
          found: hasFollowerText,
          detail: hasFollowerText ? '팔로워 텍스트는 있지만 숫자와 매칭되지 않음' : '팔로워 텍스트 없음'
        });
        
        if (!hasMetaTag && !hasFollowerText) {
          failureReason = '페이지가 정상적으로 로드되지 않았거나 비공개 계정일 수 있습니다';
        } else if (hasFollowerText && !hasTitleAttribute) {
          failureReason = '페이지 구조가 변경되었을 수 있습니다';
        } else {
          failureReason = '팔로워 수 추출 패턴이 일치하지 않습니다';
        }
      } else if (platform === 'threads') {
        // Threads 실패 원인
        const hasBarcelona = html.includes('barcelona-page-layout');
        const hasFollowerText = html.includes('팔로워') || html.includes('follower');
        const hasTitleAttribute = html.includes('title="');
        
        extractionAttempts.push({
          method: 'barcelona_layout',
          found: hasBarcelona,
          detail: hasBarcelona ? 'Barcelona 레이아웃은 있지만 팔로워 요소를 찾을 수 없음' : 'Barcelona 레이아웃 없음'
        });
        
        extractionAttempts.push({
          method: 'title_attribute',
          found: hasTitleAttribute,
          detail: hasTitleAttribute ? 'title 속성은 있지만 팔로워 수가 아님' : 'title 속성 없음'
        });
        
        if (!hasBarcelona && !hasFollowerText) {
          failureReason = '페이지가 정상적으로 로드되지 않았거나 계정이 존재하지 않을 수 있습니다';
        } else if (html.length < 50000) {
          failureReason = '페이지가 부분적으로만 로드되었습니다';
        } else {
          failureReason = 'Threads 페이지 구조가 변경되었을 수 있습니다';
        }
      } else if (platform === 'naver_blog') {
        // 네이버 블로그 실패 원인
        const hasIframe = html.includes('mainFrame');
        const hasBuddy = html.includes('이웃') || html.includes('buddy');
        
        extractionAttempts.push({
          method: 'iframe',
          found: hasIframe,
          detail: hasIframe ? 'iframe은 있지만 이웃 수를 찾을 수 없음' : 'iframe 없음 (모바일 버전일 수 있음)'
        });
        
        extractionAttempts.push({
          method: 'buddy_text',
          found: hasBuddy,
          detail: hasBuddy ? '이웃 텍스트는 있지만 숫자를 추출할 수 없음' : '이웃 관련 텍스트 없음'
        });
        
        if (!hasBuddy) {
          failureReason = '블로그가 존재하지 않거나 비공개일 수 있습니다';
        } else {
          failureReason = '블로그 이웃 수가 표시되지 않거나 페이지 구조가 변경되었습니다';
        }
      }
    }
    
    // 상세 디버그 정보 추가
    const debugInfo: any = {
      htmlLength: html.length,
      hasFollowerText: html.includes('follower') || html.includes('Follower') || html.includes('팔로워'),
      timestamp: new Date().toISOString(),
      normalizedUrl: url,
      originalUrl: rawUrl,
      success: followers > 0,
      failureReason,
      extractionAttempts
    };
    
    // Instagram 특별 디버그
    if (platform === 'instagram') {
      // HTML에서 title 속성 찾기
      const titleMatches = html.match(/title="([\d,]+)"/g);
      debugInfo.titleAttributesFound = titleMatches ? titleMatches.slice(0, 5) : [];
      
      // meta 태그 확인
      const metaMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i);
      debugInfo.metaDescription = metaMatch ? metaMatch[1].substring(0, 200) : null;
      
      // 추출 방법 확인
      if (html.includes('INSTAGRAM_FOLLOWERS_EXTRACTED')) {
        const extractMatch = html.match(/INSTAGRAM_FOLLOWERS_EXTRACTED: ([\d,]+)/);
        debugInfo.extractedValue = extractMatch ? extractMatch[1] : null;
      }
    }
    
    return NextResponse.json({
      platform,
      followers,
      html: html.substring(0, 1000), // 디버그용
      debug: debugInfo
    });
    
  } catch (error) {
    console.error('[SNS Scrape API] 스크래핑 에러:', error);
    
    if (browser) {
      await browser.close();
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch SNS content',
      details: (error as Error).message 
    }, { status: 500 });
  }
}