// SNS 스크래핑 API - 하나의 포트에서 작동
import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright'

// auto-sns.zip script.js의 정확한 추출 로직
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
      console.log(`title 속성에서 발견: ${titleMatch[1]} -> ${num}`);
    }
  }
  
  if (titleMatches.length > 0) {
    const maxNum = Math.max(...titleMatches);
    console.log(`인스타그램 팔로워 수 (최대 title 값): ${maxNum}`);
    return maxNum;
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
    /팔로워.*?<span[^>]*title="([\d,]+)"[^>]*>[^<]+<\/span>\s*명/s
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

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  
  console.log('\n========================================');
  console.log('[SNS Scrape API] 요청 받음');
  console.log('URL:', url);
  console.log('시간:', new Date().toISOString());
  console.log('========================================\n');
  
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }
  
  let browser = null;
  
  try {
    console.log(`[SNS Scrape API] Playwright로 동적 콘텐츠 가져오기 시작...`);
    
    // 브라우저 실행
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
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
    
    // Threads 특별 처리 - 빠른 추출
    if (url.includes('threads.net') || url.includes('threads.com')) {
      console.log('[Threads] 팔로워 정보 빠른 추출 시작...');
      try {
        // 팔로워 정보만 빠르게 찾기 (최대 3초)
        const followerData = await Promise.race([
          // 메인 추출 로직
          (async () => {
            // span[title] 요소가 나타날 때까지 최대 3초 대기
            await page.waitForSelector('span[title]', { timeout: 3000 }).catch(() => {});
            
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
                      return { followers: title, method: 'exact-selector' };
                    }
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
                  return { followers: title, method: 'xpath' };
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
                    return { followers: title, method: 'fallback' };
                  }
                }
              }
              
              return null;
            });
          })(),
          
          // 3초 타임아웃
          new Promise(resolve => setTimeout(() => resolve(null), 3000))
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
    
    return NextResponse.json({
      platform,
      followers,
      html: html.substring(0, 1000), // 디버그용
      debug: {
        htmlLength: html.length,
        hasFollowerText: html.includes('follower') || html.includes('Follower') || html.includes('팔로워'),
        timestamp: new Date().toISOString()
      }
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