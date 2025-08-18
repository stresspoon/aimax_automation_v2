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
    /<meta[^>]*property="og:description"[^>]*content="([^"]*[Ff]ollowers[^"]*)"/i,
    /<meta[^>]*content="([^"]*[Ff]ollowers[^"]*)"[^>]*property="og:description"/i,
    /<meta[^>]*name="description"[^>]*content="([^"]*[Ff]ollowers[^"]*)"/i,
    /<meta[^>]*content="([^"]*[Ff]ollowers[^"]*)"[^>]*name="description"/i
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
    if (num > 100 && num < 10000000) {
      titleMatches.push(num);
      console.log(`title 속성에서 발견: ${titleMatch[1]} -> ${num}`);
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
  
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }
  
  let browser = null;
  
  try {
    console.log(`[SNS Scrape API] 동적 콘텐츠 가져오기: ${url}`);
    
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
    
    // 페이지 로드
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // 추가 대기 (동적 콘텐츠 로딩)
    await page.waitForTimeout(3000);
    
    let finalHtml = null;
    
    // 네이버 블로그 특별 처리 (auto-sns.zip server-playwright.js와 동일)
    if (url.includes('blog.naver.com') || url.includes('m.blog.naver.com')) {
      if (url.includes('m.blog.naver.com')) {
        // 모바일 블로그 처리
        try {
          await page.waitForSelector('.buddy__fw6Uo, .bloger_info__eccbW', { timeout: 10000 });
          await page.waitForTimeout(2000);
          
          const mobileFollowerInfo = await page.evaluate(() => {
            const specificElement = document.querySelector('#root > div.blog_cover__qKXh9 > div > div.bloger_area__cmYsI > div.text_area__XtgMk > div.bloger_info__eccbW > span.buddy__fw6Uo');
            if (specificElement) {
              const text = specificElement.textContent?.trim() || '';
              const match = text.match(/(\d{1,3}(?:,\d{3})*)\s*명/);
              if (match) {
                return { count: match[1], text: text };
              }
            }
            return null;
          });
          
          if (mobileFollowerInfo) {
            const mobileHtml = await page.content();
            finalHtml = mobileHtml + 
              `\n<!-- MOBILE_NAVER_BLOG_FOLLOWERS: ${mobileFollowerInfo.count} -->`;
          } else {
            finalHtml = await page.content();
          }
        } catch (e) {
          finalHtml = await page.content();
        }
      } else {
        // 데스크톱 블로그 iframe 처리
        try {
          await page.waitForSelector('#mainFrame', { timeout: 10000 });
          const frameHandle = await page.$('#mainFrame');
          if (frameHandle) {
            const frame = await frameHandle.contentFrame();
            if (frame) {
              const followerInfo = await frame.evaluate(() => {
                const selectors = ['a[href*="BuddyMe"] em', '.cm-col1 em'];
                for (const selector of selectors) {
                  const elements = document.querySelectorAll(selector);
                  for (const el of elements) {
                    const parent = el.parentElement;
                    if (parent && parent.textContent?.includes('이웃')) {
                      const text = el.textContent?.trim() || '';
                      if (/^\d{1,3}(,\d{3})*$/.test(text)) {
                        return { count: text };
                      }
                    }
                  }
                }
                return null;
              });
              
              if (followerInfo) {
                const frameHtml = await frame.content();
                finalHtml = frameHtml + 
                  `\n<!-- NAVER_BLOG_FOLLOWERS: ${followerInfo.count} -->`;
              } else {
                finalHtml = await frame.content();
              }
            }
          }
        } catch (e) {
          finalHtml = await page.content();
        }
      }
    }
    
    const html = finalHtml || await page.content();
    await browser.close();
    
    // 플랫폼 감지 및 팔로워 추출
    let platform = '';
    let followers = 0;
    
    if (url.includes('instagram.com')) {
      platform = 'instagram';
      followers = extractInstagramFollowers(html);
    } else if (url.includes('threads.net') || url.includes('threads.com')) {
      platform = 'threads';
      followers = extractThreadsFollowers(html);
    } else if (url.includes('blog.naver.com') || url.includes('m.blog.naver.com')) {
      platform = 'blog';
      followers = extractBlogFollowers(html);
    }
    
    console.log(`[SNS Scrape API] ${platform} 팔로워: ${followers}`);
    
    return NextResponse.json({
      platform,
      followers,
      html: html.substring(0, 1000) // 디버그용
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