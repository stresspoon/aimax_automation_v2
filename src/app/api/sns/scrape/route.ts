// SNS 스크래핑 API - Puppeteer Core 버전 (Vercel 호환)
import { NextRequest, NextResponse } from 'next/server'
import puppeteer, { Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

// Vercel에서 브라우저 실행을 위한 설정
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// 브라우저 인스턴스 풀 관리
let browserPool: Browser[] = []
let browserInUse: boolean[] = []
const MAX_BROWSERS = 1 // 동시에 1개만 실행하여 안정성 확보
const isDev = process.env.NODE_ENV === 'development'
let browserLock = false // 단순 락 메커니즘

// 브라우저 인스턴스 가져오기 (순차 처리로 변경)
async function getBrowser(): Promise<{ browser: Browser, index: number }> {
  // 브라우저 락 대기
  while (browserLock) {
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  browserLock = true

  // 기존 브라우저가 있으면 재사용
  if (browserPool.length > 0 && !browserInUse[0]) {
    browserInUse[0] = true
    return { browser: browserPool[0], index: 0 }
  }

  // 새 브라우저 생성
  console.log(`Creating new browser instance (${browserPool.length + 1}/${MAX_BROWSERS})`)
  const browser = await puppeteer.launch(
    isDev
      ? {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        executablePath: process.platform === 'darwin'
          ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
          : process.platform === 'win32'
            ? 'C:\Program Files\Google\Chrome\Application\chrome.exe'
            : '/usr/bin/google-chrome'
      }
      : {
        args: [...(chromium as any).args, '--disable-dev-shm-usage'],
        defaultViewport: (chromium as any).defaultViewport || { width: 1920, height: 1080 },
        executablePath: await chromium.executablePath(),
        headless: (chromium as any).headless ?? true,
      }
  )

  const index = browserPool.length
  browserPool.push(browser)
  browserInUse.push(true)

  return { browser, index }
}

// 브라우저 반환 (풀로)
function releaseBrowser(index: number) {
  if (index >= 0 && index < browserInUse.length) {
    browserInUse[index] = false
    console.log(`Released browser ${index + 1}`)
  }
  browserLock = false // 락 해제
}

// 정리 함수
async function cleanupBrowsers() {
  for (const browser of browserPool) {
    try {
      await browser.close()
    } catch (e) {
      console.error('Browser close error:', e)
    }
  }
  browserPool = []
  browserInUse = []
}

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
    console.log(`Threads 팔로워 수 (추출): ${number}`);
    return number;
  }

  // 2. 인라인 스크립트에서 follower_count 추출 (가장 정확함)
  const fcMatch = html.match(/"follower_count"\s*:\s*(\d+)/);
  if (fcMatch) {
    const number = parseInt(fcMatch[1]);
    console.log(`Threads 팔로워 수 (follower_count): ${number}`);
    return number;
  }

  // 3. span title 속성에서 정확한 숫자 추출
  // 구조: <span title="5,445,331">544.5만</span>
  const titlePattern = /팔로워[^<]*<span[^>]*title="([\d,]+)"[^>]*>/i;
  const titleMatch = html.match(titlePattern);
  if (titleMatch) {
    const number = parseInt(titleMatch[1].replace(/,/g, ''));
    console.log(`Threads 팔로워 수 (span title): ${number}`);
    return number;
  }

  // 4. Meta 태그에서 찾기 (한국어 + 영어 포맷)
  const metaPatterns = [
    /<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i,
    /<meta[^>]*content="([^"]*)"[^>]*property="og:description"/i,
    /<meta[^>]*property="description"[^>]*content="([^"]*)"/i,
    /<meta[^>]*name="description"[^>]*content="([^"]*)"/i,
  ];

  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const content = match[1];
      console.log(`Meta 태그 내용:`, content.substring(0, 100));

      // 한국어: "팔로워 544.5만명"
      const korMatch = content.match(/팔로워\s*([\d,.]+)\s*만/);
      if (korMatch) {
        const number = Math.round(parseFloat(korMatch[1].replace(/,/g, '')) * 10000);
        console.log(`Threads 팔로워 수 (meta 한국어): ${number}`);
        return number;
      }

      // 영어: "123K followers" or "1.2M followers"
      const engMatch = content.match(/([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/);
      if (engMatch) {
        let number: any = engMatch[1];
        if (number.includes('K') || number.includes('k')) {
          number = parseFloat(number.replace(/[Kk,]/g, '')) * 1000;
        } else if (number.includes('M')) {
          number = parseFloat(number.replace('M', '')) * 1000000;
        } else {
          number = parseInt(number.replace(/,/g, ''));
        }
        console.log(`Threads 팔로워 수 (meta 영어): ${number}`);
        return parseInt(number) || 0;
      }
    }
  }

  return 0;
}

// URL 정규화 함수
function normalizeUrl(input: string): string {
  if (!input) return input

  const trimmed = input.trim()

  // 이미 완전한 URL인 경우 → 말단 슬래시 제거
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/\/+$/, '')
  }

  // @로 시작하는 경우 제거
  const username = trimmed.startsWith('@') ? trimmed.substring(1) : trimmed

  // 네이버 블로그
  if (username.includes('blog') || username.includes('naver')) {
    const id = username.replace(/^https?:\/\/blog\.naver\.com\//, '')
    return `https://blog.naver.com/${id}`.replace(/\/+$/, '')
  }

  // Instagram
  if (username.toLowerCase().includes('instagram') || username.toLowerCase().includes('ig.')) {
    const id = username.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    return `https://www.instagram.com/${id}`.replace(/\/+$/, '')
  }

  // 기본값: Threads
  return `https://www.threads.com/@${username}`.replace(/\/+$/, '')
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

  let browserInfo: { browser: Browser, index: number } | null = null;
  let page = null;

  try {
    console.log(`[SNS Scrape API] Puppeteer로 동적 콘텐츠 가져오기 시작...`);

    // 브라우저 풀에서 가져오기
    browserInfo = await getBrowser();
    const browser = browserInfo.browser;
    console.log(`Using browser instance ${browserInfo.index + 1}`);

    page = await browser.newPage();
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

      // 페이지 로드 대기 (안정성 강화)
      try {
        await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => console.log('Network idle timeout'));
      } catch (e) { /* ignore */ }

      // 동적 추출 시도
      const followerData = await page.evaluate(() => {
        // 1. Meta tag (가장 신뢰성 높음 - CSR이라도 초기에 박혀있을 수 있음)
        const metas = document.querySelectorAll('meta[property="og:description"], meta[name="description"]');
        for (const meta of metas) {
          const content = meta.getAttribute('content');
          if (content && content.includes('Followers')) {
            const match = content.match(/([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/);
            if (match) return match[1];
          }
        }

        // 2. 상단 프로필 팔로워 링크 (a 태그)
        // 보통 href에 'followers'가 포함됨
        const links = document.querySelectorAll('a[href*="/followers/"], a[href*="/followers"]');
        for (const link of links) {
          const text = link.textContent || '';
          // 텍스트 구조: "1.2M followers" 또는 "1,200 팔로워"
          // span 등으로 감싸져 있을 수 있으므로 내부 텍스트 전체 검사
          const match = text.match(/([\d,]+\.?\d*[KMk]?)/); // 숫자만 우선 추출

          // 링크의 부모나 형제를 확인하여 '팔로워' 텍스트 확인은 복잡하므로,
          // href가 followers인 링크의 첫번째 숫자는 팔로워 수일 확률이 매우 높음
          if (match) return text;
        }

        // 3. span[title] (전통적인 방식)
        const spans = document.querySelectorAll('span[title]');
        for (const span of spans) {
          const title = span.getAttribute('title');
          // 정확히 숫자 형식인 경우만
          if (title && /^\d{1,3}(,\d{3})*$/.test(title)) {
            // 부모 텍스트 확인
            const parentText = span.parentElement?.innerText || '';
            if (parentText.includes('follower') || parentText.includes('팔로워')) {
              return title;
            }
          }
        }

        return null;
      });

      if (followerData) {
        console.log('[Instagram] 동적 추출 성공:', followerData);
        // 텍스트에서 숫자 부분만 추출 및 파싱
        const kMatch = followerData.match(/([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/) || followerData.match(/([\d,]+\.?\d*[KMk]?)/);
        let numberStr = kMatch ? kMatch[1] : followerData;

        let number: number = 0;
        if (numberStr.toUpperCase().includes('K')) {
          number = parseFloat(numberStr.replace(/[Kk,]/g, '')) * 1000;
        } else if (numberStr.toUpperCase().includes('M')) {
          number = parseFloat(numberStr.replace(/[Mm,]/g, '')) * 1000000;
        } else {
          number = parseInt(numberStr.replace(/,/g, ''));
        }
        followers = Math.floor(number) || 0;
      }

      html = await page.content();

      // 동적 추출 실패시 정적 추출 (HTML 텍스트 기반)
      if (followers === 0) {
        console.log('[Instagram] 동적 추출 실패, 정적(Meta) 추출 시도');
        followers = extractInstagramFollowers(html);
      }

    } else if (url.includes('threads.net') || url.includes('threads.com')) {
      platform = 'threads';
      console.log('[Threads] 팔로워 추출 시작');

      // 페이지 로드 대기
      try {
        await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => console.log('Network idle timeout'));
      } catch (e) { /* ignore */ }

      // 동적 추출 시도
      const followerData = await page.evaluate(() => {
        // 1. 인라인 스크립트에서 follower_count 추출 (가장 정확함)
        const scripts = document.querySelectorAll('script:not([src])');
        for (const script of scripts) {
          const text = script.textContent || '';
          const fcMatch = text.match(/"follower_count"\s*:\s*(\d+)/);
          if (fcMatch) {
            return fcMatch[1];
          }
        }

        // 2. JSON-LD 확인 (레거시 지원)
        const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of ldScripts) {
          try {
            const json = JSON.parse(script.textContent || '{}');
            if (json.interactionStatistic) {
              const stats = Array.isArray(json.interactionStatistic)
                ? json.interactionStatistic
                : [json.interactionStatistic];

              for (const stat of stats) {
                if (stat.interactionType === 'http://schema.org/FollowAction' || stat.interactionType?.includes('FollowAction')) {
                  return stat.userInteractionCount.toString();
                }
              }
            }
          } catch (e) { }
        }

        // 3. DOM에서 span[title] 숫자 추출 (팔로워 텍스트 내부의 span)
        // 구조: <span>팔로워 <span title="5,445,331">544.5만</span>명</span>
        const allSpans = document.querySelectorAll('span');
        for (const span of allSpans) {
          const directText = Array.from(span.childNodes)
            .filter(node => node.nodeType === 3)
            .map(node => node.textContent)
            .join('');

          if (directText.includes('팔로워') || directText.toLowerCase().includes('followers')) {
            // 내부 span의 title 속성에서 정확한 숫자 추출
            const innerSpan = span.querySelector('span[title]');
            if (innerSpan) {
              const title = innerSpan.getAttribute('title') || '';
              const cleaned = title.replace(/,/g, '');
              if (/^\d+$/.test(cleaned)) {
                return cleaned;
              }
            }
            // title 없으면 전체 텍스트에서 숫자 추출
            const fullText = span.textContent || '';
            // 한국어: "팔로워 544.5만명" → 숫자+만 패턴
            const korMatch = fullText.match(/팔로워\s*([\d,.]+)\s*만/);
            if (korMatch) {
              const num = parseFloat(korMatch[1].replace(/,/g, '')) * 10000;
              return Math.round(num).toString();
            }
            // 영어: "123K followers" or "1.2M followers"
            const engMatch = fullText.match(/([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/);
            if (engMatch) return engMatch[1];
          }
        }

        // 4. meta og:description에서 추출 (한국어 포맷)
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) {
          const content = ogDesc.getAttribute('content') || '';
          // "팔로워 544.5만명" 패턴
          const korMatch = content.match(/팔로워\s*([\d,.]+)\s*만/);
          if (korMatch) {
            const num = parseFloat(korMatch[1].replace(/,/g, '')) * 10000;
            return Math.round(num).toString();
          }
          // "N followers" 패턴
          const engMatch = content.match(/([\d,]+\.?\d*[KMk]?)\s*[Ff]ollowers/);
          if (engMatch) return engMatch[1];
        }

        return null;
      });

      if (followerData) {
        console.log('[Threads] 동적 추출 성공:', followerData);
        let numberStr = followerData.replace(/,/g, '');
        let number: number = 0;

        if (numberStr.toUpperCase().includes('K')) {
          number = parseFloat(numberStr.replace(/[Kk]/g, '')) * 1000;
        } else if (numberStr.toUpperCase().includes('M')) {
          number = parseFloat(numberStr.replace(/[Mm]/g, '')) * 1000000;
        } else {
          number = parseInt(numberStr);
        }

        followers = Math.floor(number) || 0;
        html = await page.content();
        html += `\n<!-- THREADS_FOLLOWERS_EXTRACTED: ${number} -->`;
      } else {
        html = await page.content();
        followers = extractThreadsFollowers(html);
      }

    } else if (url.includes('blog.naver.com')) {
      platform = 'naver_blog';
      console.log('[네이버 블로그] 이웃수 추출 시작');

      // 페이지 로드 대기
      try {
        await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => console.log('Network idle timeout'));
      } catch (e) { /* ignore */ }

      // iframe 찾기 및 전환
      const frames = page.frames();
      console.log(`[네이버 블로그] 총 ${frames.length}개의 프레임 발견`);

      for (const frame of frames) {
        try {
          const frameUrl = frame.url();
          // mainFrame 찾기 (blog.naver.com iframe) - URL이 다르거나, 이름이 mainFrame인 경우
          // 보통 네이버 블로그는 메인 페이지 안에 실제 블로그 내용이 있는 iframe이 있음
          if ((frameUrl.includes('blog.naver.com') && frameUrl !== url) || frame.name() === 'mainFrame') {
            console.log(`[네이버 블로그] iframe 발견: ${frameUrl} (name: ${frame.name()})`);

            try {
              // iframe 로드 대기
              await frame.waitForSelector('.buddy_cnt, #widget-stat, .flick-cm-col1', { timeout: 3000 }).catch(() => { });

              // iframe 내에서 이웃 수 찾기
              const neighborInfo = await frame.evaluate(() => {
                // 1. 위젯 통계 (가장 일반적)
                const widgetEm = document.querySelector('#widget-stat em');
                if (widgetEm && widgetEm.textContent) {
                  return parseInt(widgetEm.textContent.replace(/,/g, ''));
                }

                // 2. 모바일/반응형 뷰 선택자
                const selectors = [
                  '.flick-cm-col1 em',
                  '.cm-col1 em',
                  '.buddy_cnt',
                  '.neighbor_list em',
                  '#category-list .buddy'
                ];

                for (const selector of selectors) {
                  const elements = document.querySelectorAll(selector);
                  for (const el of elements) {
                    const text = (el.textContent || '').trim();
                    if (/^\d{1,3}(,\d{3})*$/.test(text)) {
                      // 부모나 형제 텍스트 확인으로 확신 높이기
                      return parseInt(text.replace(/,/g, ''));
                    }
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

      // iframe에서 못 찾으면 메인 페이지에서 시도 (모바일 버전일 경우 등)
      if (followers === 0) {
        const mainPageNeighbors = await page.evaluate(() => {
          const bodyText = document.body.textContent || '';
          // 텍스트 전체에서 "이웃 1,234명" 패턴 찾기
          const match = bodyText.match(/이웃\s*(\d{1,3}(,\d{3})*)\s*명/);
          if (match) return parseInt(match[1].replace(/,/g, ''));

          return 0;
        });

        if (mainPageNeighbors > 0) {
          console.log(`[네이버 블로그] 메인 페이지에서 이웃 수 발견: ${mainPageNeighbors}`);
          followers = mainPageNeighbors;
        }
      }

      html = await page.content();
    }

    // 브라우저는 풀로 반환되므로 여기서 닫지 않음
    // await browser.close(); // REMOVED

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

    // 페이지 정리
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('Page close error:', e);
      }
    }

    // 브라우저를 풀로 반환 (닫지 않음)
    if (browserInfo) {
      releaseBrowser(browserInfo.index);
    }

    return NextResponse.json({
      error: 'Failed to fetch SNS content',
      details: (error as Error).message
    }, { status: 500 });
  } finally {
    // 페이지 정리
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('Page close error:', e);
      }
    }

    // 브라우저를 풀로 반환 (닫지 않음)
    if (browserInfo) {
      releaseBrowser(browserInfo.index);
    }
  }
}
