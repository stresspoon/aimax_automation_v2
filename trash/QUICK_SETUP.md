# 🚀 빠른 설정 가이드

기존 웹앱에 SNS 팔로워 확인 기능을 **5분 안에** 추가하는 방법

## Step 1: 핵심 파일 3개만 복사

### 📁 복사할 파일들:
1. **`server-playwright.js`** → 별도 서버로 실행
2. **`script.js`** → 이 중에서 필요한 함수들만 복사
3. **`package.json`** → 의존성 정보

## Step 2: 필수 함수 4개만 추출

### 🔧 `script.js`에서 복사해야 할 함수들:

```javascript
// 1️⃣ URL 정규화 (라인 93-124)
function normalizeUrl(input) { /* ... */ }

// 2️⃣ 플랫폼 감지 (라인 126-135)  
function detectPlatform(url) { /* ... */ }

// 3️⃣ 인스타그램 추출 (라인 469-608)
function extractInstagramFollowers(html) { /* ... */ }

// 4️⃣ Threads 추출 (라인 610-738)
function extractThreadsFollowers(html) { /* ... */ }

// 5️⃣ 네이버 블로그 추출 (라인 402-467)
function extractBlogFollowers(html) { /* ... */ }
```

## Step 3: 메인 함수 1개 추가

```javascript
// 🎯 이것만 호출하면 끝!
async function getSNSFollowers(url) {
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
        return { error: error.message };
    }
}
```

## Step 4: 사용법

```javascript
// ✨ 이렇게 간단하게 사용!
const result = await getSNSFollowers('username123');
console.log(result);
// { platform: 'instagram', followers: 1500, status: '통과' }

const result2 = await getSNSFollowers('@username');  
console.log(result2);
// { platform: 'threads', followers: 800, status: '통과' }
```

## Step 5: 서버 실행

```bash
# 의존성 설치 (한 번만)
npm install express cors playwright
npx playwright install

# 서버 실행 (계속 실행상태 유지)
node server-playwright.js
```

---

## 🎯 완성! 

이제 `getSNSFollowers()` 함수만 호출하면 자동으로:
- ✅ 아이디 → 전체 URL 변환
- ✅ 플랫폼 자동 감지
- ✅ 팔로워 수 정확 추출  
- ✅ 조건 통과 여부 판단

**3줄 코드로 모든 SNS 팔로워 확인 완료!** 🚀

---

## 📋 체크리스트

- [ ] `server-playwright.js` 서버 실행 중?
- [ ] `getSNSFollowers` 함수 복사 완료?
- [ ] 5개 추출 함수들 복사 완료?
- [ ] 테스트: `getSNSFollowers('test_username')` 호출해보기

모든 체크가 완료되면 바로 사용 가능합니다! ✨