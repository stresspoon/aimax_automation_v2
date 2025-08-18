const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const path = require('path');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.static('.'));

// Playwright를 사용한 동적 콘텐츠 가져오기
app.get('/dynamic-proxy', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    let browser = null;
    
    try {
        console.log(`동적 콘텐츠 가져오기: ${url}`);
        
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
        
        // HTML 저장 변수
        let finalHtml = null;
        
        // 네이버 블로그 특별 처리
        if (url.includes('blog.naver.com') || url.includes('m.blog.naver.com')) {
            try {
                // 모바일 네이버 블로그인 경우
                if (url.includes('m.blog.naver.com')) {
                    console.log('모바일 네이버 블로그 처리 시작');
                    
                    // 모바일 블로그 이웃 정보 대기
                    await page.waitForSelector('.buddy__fw6Uo, .bloger_info__eccbW', { timeout: 10000 });
                    await page.waitForTimeout(2000);
                    
                    // 모바일 블로그에서 이웃 수 추출
                    const mobileFollowerInfo = await page.evaluate(() => {
                        // 제공된 셀렉터로 찾기
                        const specificElement = document.querySelector('#root > div.blog_cover__qKXh9 > div > div.bloger_area__cmYsI > div.text_area__XtgMk > div.bloger_info__eccbW > span.buddy__fw6Uo');
                        if (specificElement) {
                            const text = specificElement.textContent.trim();
                            const match = text.match(/(\d{1,3}(?:,\d{3})*)\s*명/);
                            if (match) {
                                return {
                                    count: match[1],
                                    text: text,
                                    selector: 'specific'
                                };
                            }
                        }
                        
                        // .buddy__fw6Uo 클래스로 찾기
                        const buddyElements = document.querySelectorAll('.buddy__fw6Uo');
                        for (const el of buddyElements) {
                            const text = el.textContent.trim();
                            if (text.includes('이웃')) {
                                const match = text.match(/(\d{1,3}(?:,\d{3})*)\s*명/);
                                if (match) {
                                    return {
                                        count: match[1],
                                        text: text,
                                        selector: '.buddy__fw6Uo'
                                    };
                                }
                            }
                        }
                        
                        // 다른 패턴으로 찾기
                        const patterns = [
                            '.bloger_info__eccbW span',
                            '.text_area__XtgMk span',
                            'span[class*="buddy"]'
                        ];
                        
                        for (const pattern of patterns) {
                            const elements = document.querySelectorAll(pattern);
                            for (const el of elements) {
                                const text = el.textContent.trim();
                                if (text.includes('이웃')) {
                                    const match = text.match(/(\d{1,3}(?:,\d{3})*)\s*명/);
                                    if (match) {
                                        return {
                                            count: match[1],
                                            text: text,
                                            selector: pattern
                                        };
                                    }
                                }
                            }
                        }
                        
                        return null;
                    });
                    
                    if (mobileFollowerInfo) {
                        console.log('모바일 네이버 블로그 이웃 정보:', mobileFollowerInfo);
                        
                        // 모바일 블로그 HTML에 이웃 수 추가
                        const mobileHtml = await page.content();
                        finalHtml = mobileHtml + 
                            `\n<!-- MOBILE_NAVER_BLOG_FOLLOWERS: ${mobileFollowerInfo.count} -->` +
                            `\n<div id="injected-mobile-follower-count" style="display:none">블로그 이웃 <em>${mobileFollowerInfo.count}</em></div>`;
                    } else {
                        console.log('모바일 네이버 블로그에서 이웃 정보를 찾을 수 없음');
                        finalHtml = await page.content();
                    }
                } else {
                    // 기존 데스크톱 블로그 처리 (iframe)
                    // iframe이 로드될 때까지 대기
                    await page.waitForSelector('#mainFrame', { timeout: 10000 });
                    await page.waitForTimeout(3000);
                    
                    // iframe 내부로 전환
                    const frameHandle = await page.$('#mainFrame');
                    const frame = await frameHandle.contentFrame();
                    
                    if (frame) {
                    console.log('네이버 블로그 iframe 진입 성공');
                    
                    // iframe 내부에서 이웃 수 찾기
                    const followerInfo = await frame.evaluate(() => {
                        // 여러 선택자 시도
                        const selectors = [
                            'a[href*="BuddyMe"] em',
                            '.cm-col1 em',
                            '#widget-stat em',
                            '.buddy_cnt',
                            'em'
                        ];
                        
                        for (const selector of selectors) {
                            const elements = document.querySelectorAll(selector);
                            for (const el of elements) {
                                const parent = el.parentElement;
                                if (parent && (parent.textContent.includes('블로그 이웃') || parent.textContent.includes('이웃'))) {
                                    const text = el.textContent.trim();
                                    // 숫자 형식 확인 (예: 2,298)
                                    if (/^\d{1,3}(,\d{3})*$/.test(text)) {
                                        return {
                                            count: text,
                                            selector: selector,
                                            context: parent.textContent.substring(0, 100)
                                        };
                                    }
                                }
                            }
                        }
                        
                        // 직접 텍스트 매칭
                        const links = document.querySelectorAll('a[href*="BuddyMe"]');
                        for (const link of links) {
                            const match = link.textContent.match(/이웃\s*([\d,]+)/);
                            if (match) {
                                return {
                                    count: match[1],
                                    text: link.textContent.substring(0, 100)
                                };
                            }
                        }
                        
                        return null;
                    });
                    
                    if (followerInfo) {
                        console.log('네이버 블로그 이웃 정보 (iframe 내부):', followerInfo);
                        
                        // iframe 내부의 HTML을 가져와서 반환
                        const frameHtml = await frame.content();
                        
                        // 찾은 이웃 수를 HTML에 명시적으로 추가
                        finalHtml = frameHtml + 
                            `\n<!-- NAVER_BLOG_FOLLOWERS: ${followerInfo.count} -->` +
                            `\n<div id="injected-follower-count" style="display:none">블로그 이웃 <em>${followerInfo.count}</em></div>`;
                    } else {
                        console.log('iframe 내부에서 이웃 정보를 찾을 수 없음');
                        // iframe 내부 HTML 반환
                        finalHtml = await frame.content();
                    }
                    } else {
                        console.log('네이버 블로그 iframe을 찾을 수 없음');
                    }
                }
            } catch (e) {
                console.log('네이버 블로그 이웃 수 찾기 실패:', e.message);
            }
        }
        
        // 인스타그램 특별 처리
        if (url.includes('instagram.com')) {
            try {
                // 팔로워 수가 포함된 요소 대기
                await page.waitForSelector('meta[property="og:description"]', { timeout: 5000 });
                
                // 팔로워 정보 추출
                const followerInfo = await page.evaluate(() => {
                    // Meta 태그에서 찾기
                    const metaDesc = document.querySelector('meta[property="og:description"]');
                    if (metaDesc) {
                        const content = metaDesc.getAttribute('content');
                        console.log('Instagram meta description:', content);
                    }
                    
                    // 팔로워 텍스트 직접 찾기
                    const elements = document.querySelectorAll('*');
                    for (const el of elements) {
                        if (el.textContent && (el.textContent.includes('팔로워') || el.textContent.includes('Followers'))) {
                            const text = el.textContent;
                            const match = text.match(/([\d,]+)\s*(팔로워|Followers)/);
                            if (match) {
                                return {
                                    count: match[1],
                                    text: text.substring(0, 100)
                                };
                            }
                        }
                    }
                    return null;
                });
                
                if (followerInfo) {
                    console.log('Instagram 팔로워 정보:', followerInfo);
                }
            } catch (e) {
                console.log('Instagram 팔로워 요소 찾기 실패:', e.message);
            }
        }
        
        // Threads 특별 처리
        if (url.includes('threads')) {
            try {
                // 팔로워 엘리먼트가 로드될 때까지 대기
                await page.waitForSelector('span[title]', { timeout: 5000 });
                
                // 팔로워 정보 추출
                const followerInfo = await page.evaluate(() => {
                    // title 속성이 있는 span 찾기
                    const spans = document.querySelectorAll('span[title]');
                    for (const span of spans) {
                        const title = span.getAttribute('title');
                        if (title && /^\d{1,3}(,\d{3})*$/.test(title)) {
                            const parent = span.parentElement;
                            if (parent && parent.textContent.includes('팔로워')) {
                                return {
                                    count: title,
                                    text: parent.textContent
                                };
                            }
                        }
                    }
                    
                    // 팔로워 텍스트 직접 찾기
                    const elements = document.querySelectorAll('*');
                    for (const el of elements) {
                        if (el.textContent && el.textContent.includes('팔로워')) {
                            const match = el.textContent.match(/(\d{1,3}(?:,\d{3})*|\d+\.?\d*[만천])\s*명?/);
                            if (match) {
                                return {
                                    count: match[1],
                                    text: el.textContent
                                };
                            }
                        }
                    }
                    return null;
                });
                
                if (followerInfo) {
                    console.log('Threads 팔로워 정보:', followerInfo);
                }
            } catch (e) {
                console.log('Threads 팔로워 요소 찾기 실패:', e.message);
            }
        }
        
        // 전체 HTML 가져오기
        const html = finalHtml || await page.content();
        
        await browser.close();
        
        res.send(html);
    } catch (error) {
        console.error('Dynamic proxy error:', error.message);
        
        if (browser) {
            await browser.close();
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch dynamic content',
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════╗
    ║   Playwright 서버가 시작되었습니다!           ║
    ╠══════════════════════════════════════════════╣
    ║   서버 주소: http://localhost:${PORT}         ║
    ║   동적 콘텐츠를 가져올 수 있습니다           ║
    ╚══════════════════════════════════════════════╝
    `);
});