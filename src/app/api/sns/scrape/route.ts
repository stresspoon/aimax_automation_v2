// SNS 스크래핑 API - Puppeteer Core 버전 (Vercel 호환)
import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

// Vercel에서 브라우저 실행을 위한 설정
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Instagram 팔로워 추출 함수
function extractInstagramFollowers(html: string): number {
  console.log('인스타그램 팔로워 추출 시작...');
  
  // Meta 태그에서 찾기
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
      
      // "663M Followers", "300M followers" 등 처리
      const followerPatterns = [
        /([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/,
        /([\d,]+\.?\d*[KMk]?)\s*팔로워/,
        /팔로워\s*([\d,]+\.?\d*[KMk만천]?)명?/,
      ];
      
      for (const fPattern of followerPatterns) {
        const fMatch = content.match(fPattern);
        if (fMatch) {
          let number: any = fMatch[1];
          console.log(`매치된 팔로워 텍스트: "${number}"`);
          
          // K, M 처리
          if (typeof number === 'string') {
            if (number.toUpperCase().includes('K')) {
              number = parseFloat(number.replace(/[Kk,]/g, '')) * 1000;
            } else if (number.toUpperCase().includes('M')) {
              number = parseFloat(number.replace(/[Mm,]/g, '')) * 1000000;
            } else if (number.includes('만')) {
              number = parseFloat(number.replace(/[만,]/g, '')) * 10000;
            } else {
              number = parseInt(number.replace(/,/g, ''));
            }
          }
          
          console.log(`인스타그램 팔로워 수: ${number}`);
          return parseInt(number) || 0;
        }
      }
    }
  }
  
  return 0;
}

// Threads 팔로워 추출 함수
function extractThreadsFollowers(html: string): number {
  console.log('Threads 팔로워 추출 시작...');
  console.log('HTML 길이:', html.length);
  
  // 1. 주입된 데이터 확인
  const extractedPattern = /<!-- THREADS_FOLLOWERS_EXTRACTED: ([\d,]+) -->/;
  const extractedMatch = html.match(extractedPattern);
  if (extractedMatch) {
    const number = parseInt(extractedMatch[1].replace(/,/g, ''));
    console.log(`✅ Threads 팔로워 수 (추출): ${number}`);
    return number;
  }
  
  // 2. Meta 태그에서 찾기
  const metaPatterns = [
    /<meta[^>]*property="og:description"[^>]*content="([^"]*[Ff]ollowers[^"]*)"/i,
    /<meta[^>]*content="([^"]*[Ff]ollowers[^"]*)"[^>]*property="og:description"/i,
  ];
  
  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    if (match) {
      console.log(`Meta 태그 내용:`, match[1].substring(0, 100));
      const numMatch = match[1].match(/([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/);
      if (numMatch) {
        let number: any = numMatch[1];
        if (number.includes('K') || number.includes('k')) {
          number = parseFloat(number.replace(/[Kk]/g, '')) * 1000;
        } else if (number.includes('M')) {
          number = parseFloat(number.replace('M', '')) * 1000000;
        } else {
          number = parseInt(number.replace(/,/g, ''));
        }
        console.log(`✅ Threads 팔로워 수 (meta): ${number}`);
        return parseInt(number) || 0;
      }
    }
  }
  
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
  
  // 네이버 블로그
  if (username.includes('blog') || username.includes('naver')) {
    return `https://blog.naver.com/${username.replace('blog.naver.com/', '').replace('https://', '')}`;
  }
  
  // Instagram
  if (username.toLowerCase().includes('instagram') || username.toLowerCase().includes('ig.')) {
    return `https://www.instagram.com/${username.replace('instagram.com/', '').replace('https://', '')}`;
  }
  
  // 기본값: Threads
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
  console.log('========================================\n');
  
  let browser = null;
  
  try {
    console.log(`[SNS Scrape API] Puppeteer로 동적 콘텐츠 가져오기 시작...`);
    
    // Vercel 환경 체크
    const isVercel = process.env.VERCEL === '1';
    
    // 브라우저 실행
    if (isVercel) {
      // Vercel 환경
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: 1920, height: 1080 },
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      // 로컬 환경 - puppeteer-core는 로컬에서 Chrome 경로 필요
      const executablePath = process.platform === 'darwin' 
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/usr/bin/google-chrome';
        
      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 페이지 로드
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // 플랫폼별 처리
    let html = '';
    let platform = '';
    let followers = 0;
    
    if (url.includes('instagram.com')) {
      platform = 'instagram';
      console.log('[Instagram] 팔로워 추출 시작');
      
      // 페이지 로드 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 동적 추출 시도
      const followerData = await page.evaluate(() => {
        // 팔로워 링크 찾기
        const links = document.querySelectorAll('a[href*="/followers"]');
        for (const link of links) {
          const text = link.textContent || '';
          const match = text.match(/([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/);
          if (match) {
            return match[1];
          }
        }
        
        // span[title] 찾기
        const spans = document.querySelectorAll('span[title]');
        for (const span of spans) {
          const title = span.getAttribute('title');
          if (title && /^\d{1,3}(,\d{3})*$/.test(title)) {
            const parent = span.parentElement;
            if (parent && parent.textContent?.toLowerCase().includes('follower')) {
              return title;
            }
          }
        }
        
        return null;
      });
      
      if (followerData) {
        console.log('[Instagram] 동적 추출 성공:', followerData);
        let number: any = followerData;
        if (number.includes('K') || number.includes('k')) {
          number = parseFloat(number.replace(/[Kk,]/g, '')) * 1000;
        } else if (number.includes('M')) {
          number = parseFloat(number.replace(/[Mm,]/g, '')) * 1000000;
        } else {
          number = parseInt(number.replace(/,/g, ''));
        }
        followers = parseInt(number) || 0;
      }
      
      html = await page.content();
      
      // 동적 추출 실패시 정적 추출
      if (followers === 0) {
        followers = extractInstagramFollowers(html);
      }
      
    } else if (url.includes('threads.net') || url.includes('threads.com')) {
      platform = 'threads';
      console.log('[Threads] 팔로워 추출 시작');
      
      // 페이지 로드 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 동적 추출 시도
      const followerData = await page.evaluate(() => {
        // 방법 1: 특정 클래스 조합으로 찾기
        const containers = document.querySelectorAll('div.x78zum5.x2lah0s');
        for (const container of containers) {
          const spans = container.querySelectorAll('span > span[title]');
          for (const span of spans) {
            const title = span.getAttribute('title');
            if (title && /^\d{1,3}(,\d{3})*$/.test(title)) {
              const parent = span.parentElement;
              if (parent && parent.textContent?.includes('팔로워')) {
                return title;
              }
            }
          }
        }
        
        // 방법 2: barcelona 레이아웃
        const layoutRoot = document.querySelector('#barcelona-page-layout');
        if (layoutRoot) {
          const followerSpan = layoutRoot.querySelector('div.x78zum5.x2lah0s span[title]') as HTMLSpanElement | null;
          if (followerSpan) {
            const title = followerSpan.getAttribute('title');
            if (title && /^\d{1,3}(,\d{3})*$/.test(title)) {
              return title;
            }
          }
        }
        
        return null;
      });
      
      if (followerData) {
        console.log('[Threads] 동적 추출 성공:', followerData);
        followers = parseInt(followerData.replace(/,/g, '')) || 0;
        html = await page.content();
        html += `\n<!-- THREADS_FOLLOWERS_EXTRACTED: ${followerData} -->`;
      } else {
        html = await page.content();
        followers = extractThreadsFollowers(html);
      }
      
    } else if (url.includes('blog.naver.com')) {
      platform = 'naver_blog';
      console.log('[네이버 블로그] 이웃수 추출 시작');
      
      // 페이지 로드 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // iframe 찾기 및 전환
      const frames = page.frames();
      console.log(`[네이버 블로그] 총 ${frames.length}개의 프레임 발견`);
      
      for (const frame of frames) {
        try {
          const frameUrl = frame.url();
          console.log(`프레임 URL: ${frameUrl}`);
          
          // mainFrame 찾기 (blog.naver.com iframe)
          if (frameUrl.includes('blog.naver.com') && frameUrl !== url) {
            console.log(`[네이버 블로그] iframe 발견: ${frameUrl}`);
            
            try {
              // iframe 내에서 이웃 수 찾기
              const neighborInfo = await frame.evaluate(() => {
                // 우선순위 셀렉터들
                const selectors = [
                  '.flick-cm-col1 em',
                  '.cm-col1 em',
                  '#widget-stat em',
                  '.buddy_cnt',
                  'em'
                ];
                
                for (const selector of selectors) {
                  const elements = document.querySelectorAll(selector);
                  for (const el of elements) {
                    const parent = el.parentElement;
                    if (parent && (parent.textContent?.includes('블로그 이웃') || parent.textContent?.includes('이웃'))) {
                      const text = (el.textContent || '').trim();
                      // 숫자 형식 확인 (예: 2,298)
                      if (/^\d{1,3}(,\d{3})*$/.test(text)) {
                        return parseInt(text.replace(/,/g, ''));
                      }
                    }
                  }
                }
                
                // 직접 텍스트 매칭
                const links = document.querySelectorAll('a[href*="BuddyMe"]');
                for (const link of links) {
                  const match = (link.textContent || '').match(/이웃\s*([\d,]+)/);
                  if (match) {
                    return parseInt(match[1].replace(/,/g, ''));
                  }
                }
                
                return 0;
              });
              
              if (neighborInfo > 0) {
                console.log(`[네이버 블로그] iframe에서 이웃 수 발견: ${neighborInfo}`);
                followers = neighborInfo;
                break;
              }
            } catch (e) {
              console.log(`iframe 처리 중 오류:`, e);
            }
          }
        } catch (e) {
          console.log(`프레임 처리 중 오류:`, e);
        }
      }
      
      // iframe에서 못 찾으면 메인 페이지에서 시도
      if (followers === 0) {
        const mainPageNeighbors = await page.evaluate(() => {
          const bodyText = document.body.textContent || '';
          const match = bodyText.match(/이웃\s*(\d+)\s*명/);
          return match ? parseInt(match[1]) : 0;
        });
        
        if (mainPageNeighbors > 0) {
          console.log(`[네이버 블로그] 메인 페이지에서 이웃 수 발견: ${mainPageNeighbors}`);
          followers = mainPageNeighbors;
        }
      }
      
      html = await page.content();
    }
    
    await browser.close();
    
    console.log('\n========================================');
    console.log(`[SNS Scrape API] 최종 결과`);
    console.log(`플랫폼: ${platform}`);
    console.log(`팔로워: ${followers}`);
    console.log('========================================\n');
    
    return NextResponse.json({
      platform,
      followers,
      debug: {
        htmlLength: html.length,
        hasFollowerText: html.includes('follower') || html.includes('Follower') || html.includes('팔로워'),
        timestamp: new Date().toISOString(),
        normalizedUrl: url,
        originalUrl: rawUrl,
        success: followers > 0
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