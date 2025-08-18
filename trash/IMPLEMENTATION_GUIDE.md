# 🔧 SNS 팔로워 추출 기능 구현 가이드

다른 웹앱에 SNS 팔로워 추출 기능을 정확히 적용하는 방법을 단계별로 설명합니다.

## 📋 목차
1. [핵심 추출 로직](#1-핵심-추출-로직)
2. [Playwright 서버 구현](#2-playwright-서버-구현)
3. [프론트엔드 함수](#3-프론트엔드-함수)
4. [구글 시트 연동](#4-구글-시트-연동)
5. [UI 컴포넌트](#5-ui-컴포넌트)

---

## 1. 핵심 추출 로직

### 📁 `script.js` 파일에서 복사해야 할 함수들

#### 1.1 URL 정규화 함수 (라인 93-124)
```javascript
// URL 정규화 함수 (아이디만 입력한 경우 전체 URL로 변환)
function normalizeUrl(input) {
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
```

#### 1.2 플랫폼 감지 함수 (라인 126-135)
```javascript
function detectPlatform(url) {
    if (url.includes('blog.naver.com') || url.includes('m.blog.naver.com')) {
        return 'blog';
    } else if (url.includes('instagram.com')) {
        return 'instagram';
    } else if (url.includes('threads.net') || url.includes('threads.com')) {
        return 'threads';
    }
    return null;
}
```

#### 1.3 팔로워 추출 함수들

**Instagram 추출 (라인 469-608)**
```javascript
function extractInstagramFollowers(html) {
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
                    let number = fMatch[1];
                    
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
    let titleMatches = [];
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
```

**Threads 추출 (라인 610-738)**
```javascript
function extractThreadsFollowers(html) {
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
    let titleMatches = [];
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
```

**네이버 블로그 추출 (라인 402-467)**
```javascript
function extractBlogFollowers(html) {
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
            const number = match[1].replace(/,/g, '');
            return parseInt(number) || 0;
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
            const number = match[1].replace(/,/g, '');
            return parseInt(number) || 0;
        }
    }
    
    return 0;
}
```

---

## 2. Playwright 서버 구현

### 📁 새로운 파일 생성: `sns-scraper-server.js`

```javascript
const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
const PORT = 3002;

app.use(cors());

// Playwright를 사용한 동적 콘텐츠 가져오기
app.get('/sns-scrape', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    let browser = null;
    
    try {
        console.log(`SNS 콘텐츠 가져오기: ${url}`);
        
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            locale: 'ko-KR'
        });
        
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        let finalHtml = null;
        
        // 네이버 블로그 특별 처리
        if (url.includes('blog.naver.com') || url.includes('m.blog.naver.com')) {
            if (url.includes('m.blog.naver.com')) {
                // 모바일 블로그 처리
                await page.waitForSelector('.buddy__fw6Uo, .bloger_info__eccbW', { timeout: 10000 });
                await page.waitForTimeout(2000);
                
                const mobileFollowerInfo = await page.evaluate(() => {
                    const specificElement = document.querySelector('#root > div.blog_cover__qKXh9 > div > div.bloger_area__cmYsI > div.text_area__XtgMk > div.bloger_info__eccbW > span.buddy__fw6Uo');
                    if (specificElement) {
                        const text = specificElement.textContent.trim();
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
            } else {
                // 데스크톱 블로그 iframe 처리
                await page.waitForSelector('#mainFrame', { timeout: 10000 });
                const frameHandle = await page.$('#mainFrame');
                const frame = await frameHandle.contentFrame();
                
                if (frame) {
                    const followerInfo = await frame.evaluate(() => {
                        const selectors = ['a[href*="BuddyMe"] em', '.cm-col1 em'];
                        for (const selector of selectors) {
                            const elements = document.querySelectorAll(selector);
                            for (const el of elements) {
                                const parent = el.parentElement;
                                if (parent && parent.textContent.includes('이웃')) {
                                    const text = el.textContent.trim();
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
        }
        
        const html = finalHtml || await page.content();
        await browser.close();
        
        res.send(html);
    } catch (error) {
        console.error('SNS scraping error:', error.message);
        
        if (browser) {
            await browser.close();
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch SNS content',
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`SNS Scraper 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
```

---

## 3. 프론트엔드 함수

### 3.1 메인 처리 함수

```javascript
// SNS 팔로워 확인 함수
async function checkSNSFollowers(url) {
    const normalizedUrl = normalizeUrl(url);
    const platform = detectPlatform(normalizedUrl);
    
    if (!platform) {
        throw new Error('지원하지 않는 플랫폼입니다.');
    }
    
    try {
        // Playwright 서버 호출
        const response = await fetch(`http://localhost:3002/sns-scrape?url=${encodeURIComponent(normalizedUrl)}`);
        
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
        throw error;
    }
}
```

---

## 4. 구글 시트 연동

### 4.1 CSV 파싱 함수 (라인 829-926)

```javascript
function parseGoogleFormSheetCSV(csvText) {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length === 0) return { applicants: [], urls: [] };
    
    // CSV 파싱
    const rows = lines.map(line => {
        const result = [];
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
    const urls = [];
    
    // 첫 번째 행은 헤더로 건너뛰기
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        
        const name = row[nameColumnIndex] ? row[nameColumnIndex].replace(/^"|"$/g, '').trim() : `지원자${i}`;
        
        const applicant = {
            name: name,
            rowIndex: i,
            sns: { threads: null, instagram: null, blog: null }
        };
        
        // 각 SNS URL 처리
        ['threads', 'instagram', 'blog'].forEach((snsType, index) => {
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
```

---

## 5. UI 컴포넌트

### 5.1 결과 테이블 생성 함수

```javascript
function createApplicantResultsTable(applicants, urlResults) {
    const tableHtml = `
        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h3 style="margin-top: 0; color: #333;">📋 지원자별 심사 결과</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #667eea; color: white;">
                        <th style="padding: 12px; border: 1px solid #ddd;">이름</th>
                        <th style="padding: 12px; border: 1px solid #ddd;">Threads<br><small>(500명 이상)</small></th>
                        <th style="padding: 12px; border: 1px solid #ddd;">Instagram<br><small>(1,000명 이상)</small></th>
                        <th style="padding: 12px; border: 1px solid #ddd;">Blog<br><small>(300명 이상)</small></th>
                        <th style="padding: 12px; border: 1px solid #ddd;">최종 결과</th>
                    </tr>
                </thead>
                <tbody id="applicantTableBody"></tbody>
            </table>
        </div>
    `;
    
    return tableHtml;
}
```

---

## 6. 패키지 의존성

### 📁 `package.json`에 추가해야 할 의존성:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5", 
    "playwright": "^1.54.2"
  }
}
```

### 설치 명령어:
```bash
npm install express cors playwright
npx playwright install
```

---

## 7. 적용 순서

1. **의존성 설치** (`npm install`)
2. **서버 파일 생성** (`sns-scraper-server.js`)
3. **함수 복사** (위의 JavaScript 함수들)
4. **서버 실행** (`node sns-scraper-server.js`)
5. **테스트** (개별 URL로 테스트 후 구글 시트 연동)

---

## ⚠️ 중요 포인트

- **Playwright 서버**는 반드시 별도 포트(3002)에서 실행
- **CORS** 설정 필수
- **Meta 태그** 우선 추출 후 **title 속성** 백업 추출
- **모바일/데스크톱** 네이버 블로그 분기 처리
- **K/M/만/천** 단위 변환 로직 필수

이 가이드를 따라하면 정확히 같은 추출 결과를 얻을 수 있습니다! 🎯