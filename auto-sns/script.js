document.addEventListener('DOMContentLoaded', function() {
    // 탭 전환 기능
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // 탭 버튼 활성화
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 탭 콘텐츠 표시
            tabContents.forEach(content => {
                if (content.id === targetTab + '-tab') {
                    content.classList.add('active');
                    content.style.display = 'block';
                } else {
                    content.classList.remove('active');
                    content.style.display = 'none';
                }
            });
        });
    });
    const urlInput = document.getElementById('urlInput');
    const checkBtn = document.getElementById('checkBtn');
    const loading = document.getElementById('loading');
    const debugBtn = document.getElementById('debugBtn');
    const debugSection = document.getElementById('debugSection');
    const saveHtmlBtn = document.getElementById('saveHtmlBtn');
    const debugInfo = document.getElementById('debugInfo');
    
    let lastHtml = '';
    let debugMode = false;
    
    debugBtn.addEventListener('click', function() {
        debugMode = !debugMode;
        debugSection.style.display = debugMode ? 'block' : 'none';
        debugBtn.textContent = debugMode ? '디버그 끄기' : '디버그 모드';
        debugBtn.style.background = debugMode ? '#dc3545' : '#6c757d';
    });
    
    saveHtmlBtn.addEventListener('click', function() {
        if (lastHtml) {
            const blob = new Blob([lastHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sns_response.html';
            a.click();
            URL.revokeObjectURL(url);
        } else {
            alert('먼저 팔로워 확인을 실행해주세요.');
        }
    });

    checkBtn.addEventListener('click', async function() {
        const input = urlInput.value.trim();
        
        if (!input) {
            alert('URL 또는 아이디를 입력해주세요!');
            return;
        }

        // URL 정규화 (아이디만 입력한 경우 전체 URL로 변환)
        const url = normalizeUrl(input);
        
        // 정규화된 URL을 입력창에 표시
        if (url !== input) {
            urlInput.value = url;
            console.log(`입력값 "${input}"을 "${url}"로 변환했습니다.`);
        }

        resetResults();
        loading.classList.add('show');

        try {
            const platform = detectPlatform(url);
            
            if (!platform) {
                alert('지원하지 않는 플랫폼입니다. 네이버 블로그, 인스타그램, Threads URL을 입력해주세요.');
                loading.classList.remove('show');
                return;
            }

            // 인스타그램과 네이버 블로그는 Playwright 사용
            if (platform === 'instagram' || platform === 'blog') {
                await checkFollowersWithPlaywright(url, platform);
            } else {
                await checkFollowers(url, platform);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('팔로워 확인 중 오류가 발생했습니다. 프록시 서버를 실행했는지 확인해주세요.');
        } finally {
            loading.classList.remove('show');
        }
    });

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

    function resetResults() {
        const statuses = ['blogStatus', 'instaStatus', 'threadsStatus'];
        const followers = ['blogFollowers', 'instaFollowers', 'threadsFollowers'];
        const results = ['blogResult', 'instaResult', 'threadsResult'];

        statuses.forEach(id => {
            const elem = document.getElementById(id);
            elem.textContent = '대기중';
            elem.className = 'status waiting';
        });

        followers.forEach(id => {
            document.getElementById(id).textContent = '-';
        });

        results.forEach(id => {
            const elem = document.getElementById(id);
            elem.className = 'check-result';
            elem.textContent = '';
        });
    }

    async function checkFollowersWithPlaywright(url, platform) {
        const statusId = platform === 'instagram' ? 'instaStatus' : 
                        platform === 'blog' ? 'blogStatus' : 'threadsStatus';
        const followersId = platform === 'instagram' ? 'instaFollowers' : 
                           platform === 'blog' ? 'blogFollowers' : 'threadsFollowers';
        const resultId = platform === 'instagram' ? 'instaResult' : 
                        platform === 'blog' ? 'blogResult' : 'threadsResult';

        const statusElem = document.getElementById(statusId);
        const followersElem = document.getElementById(followersId);
        const resultElem = document.getElementById(resultId);

        statusElem.textContent = '로딩중 (시간이 걸릴 수 있습니다)';
        statusElem.className = 'status checking';

        try {
            const playwrightUrl = `http://localhost:3002/dynamic-proxy?url=${encodeURIComponent(url)}`;
            const response = await fetch(playwrightUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch');
            }

            const html = await response.text();
            lastHtml = html;
            
            console.log(`Playwright로 가져온 ${platform.toUpperCase()} HTML 길이: ${html.length}`);
            
            let followerCount = 0;
            if (platform === 'instagram') {
                followerCount = extractInstagramFollowers(html);
            } else if (platform === 'threads') {
                followerCount = extractThreadsFollowers(html);
            } else if (platform === 'blog') {
                followerCount = extractBlogFollowers(html);
            }

            followersElem.textContent = followerCount.toLocaleString() + '명';

            const minRequirement = platform === 'instagram' ? 1000 : 
                                  platform === 'blog' ? 300 : 500;

            if (followerCount >= minRequirement) {
                statusElem.textContent = '통과';
                statusElem.className = 'status success';
                resultElem.textContent = '✅ 조건을 충족합니다!';
                resultElem.className = 'check-result show pass';
            } else {
                statusElem.textContent = '미달';
                statusElem.className = 'status fail';
                resultElem.textContent = `❌ 최소 ${minRequirement}명이 필요합니다.`;
                resultElem.className = 'check-result show fail';
            }
        } catch (error) {
            console.error('Playwright 서버 오류:', error);
            statusElem.textContent = '오류';
            statusElem.className = 'status fail';
            resultElem.textContent = 'Playwright 서버가 실행 중인지 확인해주세요';
            resultElem.className = 'check-result show fail';
            throw error;
        }
    }

    async function checkFollowers(url, platform) {
        const statusId = platform + 'Status';
        const followersId = platform === 'blog' ? 'blogFollowers' : 
                           platform === 'instagram' ? 'instaFollowers' : 'threadsFollowers';
        const resultId = platform === 'blog' ? 'blogResult' : 
                        platform === 'instagram' ? 'instaResult' : 'threadsResult';

        const statusElem = document.getElementById(statusId);
        const followersElem = document.getElementById(followersId);
        const resultElem = document.getElementById(resultId);

        statusElem.textContent = '확인중';
        statusElem.className = 'status checking';

        try {
            let targetUrl = url;
            
            // 네이버 블로그의 경우 iframe URL로 직접 접근
            if (platform === 'blog') {
                const blogId = url.split('/').pop();
                targetUrl = `https://blog.naver.com/PostList.naver?blogId=${blogId}`;
            }
            
            // Threads의 경우 Playwright 서버 사용 (동적 콘텐츠)
            if (platform === 'threads') {
                console.log('Threads는 Playwright 서버 사용');
                targetUrl = url;
                // Playwright 서버 사용
                const playwrightUrl = `http://localhost:3002/dynamic-proxy?url=${encodeURIComponent(url)}`;
                try {
                    statusElem.textContent = '로딩중 (시간이 걸릴 수 있습니다)';
                    const response = await fetch(playwrightUrl);
                    if (response.ok) {
                        const html = await response.text();
                        lastHtml = html;
                        
                        console.log(`Playwright로 가져온 HTML 길이: ${html.length}`);
                        
                        // 팔로워 수 추출
                        let followerCount = extractThreadsFollowers(html);
                        
                        if (followerCount > 0) {
                            followersElem.textContent = followerCount.toLocaleString() + '명';
                            
                            const minRequirement = 500;
                            if (followerCount >= minRequirement) {
                                statusElem.textContent = '통과';
                                statusElem.className = 'status success';
                                resultElem.textContent = '✅ 조건을 충족합니다!';
                                resultElem.className = 'check-result show pass';
                            } else {
                                statusElem.textContent = '미달';
                                statusElem.className = 'status fail';
                                resultElem.textContent = `❌ 최소 ${minRequirement}명이 필요합니다.`;
                                resultElem.className = 'check-result show fail';
                            }
                        } else {
                            statusElem.textContent = '확인 실패';
                            statusElem.className = 'status fail';
                            resultElem.textContent = '팔로워 수를 확인할 수 없습니다';
                            resultElem.className = 'check-result show fail';
                        }
                        return;
                    }
                } catch (e) {
                    console.error('Playwright 서버 오류:', e);
                    statusElem.textContent = '오류';
                    statusElem.className = 'status fail';
                    resultElem.textContent = 'Playwright 서버가 실행 중인지 확인해주세요';
                    resultElem.className = 'check-result show fail';
                    return;
                }
            }
            
            const proxyUrl = `http://localhost:3000/proxy?url=${encodeURIComponent(targetUrl)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch');
            }

            const html = await response.text();
            lastHtml = html;  // HTML 저장
            
            // 디버깅: HTML 내용 확인
            console.log(`=== ${platform.toUpperCase()} HTML 길이: ${html.length} 문자 ===`);
            
            if (debugMode) {
                let debugText = `플랫폼: ${platform}\n`;
                debugText += `URL: ${targetUrl}\n`;
                debugText += `HTML 길이: ${html.length} 문자\n\n`;
                
                // HTML의 일부를 디버그 섹션에 표시
                const keywords = ['팔로워', 'follower', '이웃', 'Followers', '명'];
                keywords.forEach(keyword => {
                    const index = html.toLowerCase().indexOf(keyword.toLowerCase());
                    if (index !== -1) {
                        const snippet = html.substring(Math.max(0, index - 100), Math.min(html.length, index + 200));
                        debugText += `\n"${keyword}" 주변 텍스트:\n${snippet}\n`;
                    }
                });
                
                // 숫자 패턴 찾기
                const numberPatterns = html.match(/[\d,]+\d{3,}/g);
                if (numberPatterns) {
                    debugText += `\n발견된 큰 숫자들: ${numberPatterns.slice(0, 20).join(', ')}\n`;
                }
                
                debugInfo.textContent = debugText;
            }
            
            // HTML의 일부를 콘솔에 출력 (팔로워 관련 부분 찾기)
            const keywords = ['팔로워', 'follower', '이웃', 'Followers', '명', 'title='];
            keywords.forEach(keyword => {
                const index = html.toLowerCase().indexOf(keyword.toLowerCase());
                if (index !== -1) {
                    const snippet = html.substring(Math.max(0, index - 100), Math.min(html.length, index + 200));
                    console.log(`"${keyword}" 주변 텍스트:`, snippet);
                }
            });
            
            // 숫자 패턴 찾기 (1,000 이상의 숫자)
            const numberPatterns = html.match(/[\d,]+\d{3,}/g);
            if (numberPatterns) {
                console.log('발견된 큰 숫자들:', numberPatterns.slice(0, 10));
            }
            
            let followerCount = 0;

            if (platform === 'blog') {
                followerCount = extractBlogFollowers(html);
            } else if (platform === 'instagram') {
                followerCount = extractInstagramFollowers(html);
            } else if (platform === 'threads') {
                followerCount = extractThreadsFollowers(html);
            }

            followersElem.textContent = followerCount.toLocaleString() + '명';

            const minRequirement = platform === 'blog' ? 300 : 
                                  platform === 'instagram' ? 1000 : 500;

            if (followerCount >= minRequirement) {
                statusElem.textContent = '통과';
                statusElem.className = 'status success';
                resultElem.textContent = '✅ 조건을 충족합니다!';
                resultElem.className = 'check-result show pass';
            } else {
                statusElem.textContent = '미달';
                statusElem.className = 'status fail';
                resultElem.textContent = `❌ 최소 ${minRequirement}명이 필요합니다.`;
                resultElem.className = 'check-result show fail';
            }
        } catch (error) {
            statusElem.textContent = '오류';
            statusElem.className = 'status fail';
            resultElem.textContent = '확인 실패';
            resultElem.className = 'check-result show fail';
            throw error;
        }
    }

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
                console.log(`모바일 네이버 블로그 이웃 수 (패턴): ${number}`);
                return parseInt(number) || 0;
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
                const number = match[1].replace(/,/g, '');
                console.log(`네이버 블로그 이웃 수 (패턴): ${number}`);
                return parseInt(number) || 0;
            }
        }

        // <em> 태그 안의 숫자를 찾되, 블로그 이웃과 관련된 것만
        const buddyPattern = /href[^>]*BuddyMe[^>]*>.*?<em[^>]*>([\d,]+)<\/em>/i;
        const buddyMatch = html.match(buddyPattern);
        if (buddyMatch) {
            const number = buddyMatch[1].replace(/,/g, '');
            console.log(`네이버 블로그 이웃 수 (BuddyMe 링크): ${number}`);
            return parseInt(number) || 0;
        }

        // 가장 큰 em 태그 숫자 찾기 (최후의 수단)
        const emPattern = /<em[^>]*>([\d,]+)<\/em>/g;
        let maxNum = 0;
        let emMatch;
        while ((emMatch = emPattern.exec(html)) !== null) {
            const num = parseInt(emMatch[1].replace(/,/g, ''));
            // 2,000 ~ 10,000 사이의 숫자 (일반적인 이웃 수 범위)
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
                        let number = fMatch[1];
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
        let titleMatches = [];
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
                let number = match[1];
                
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
                    let number = numMatch[1];
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
        
        // 2. title 속성에서 정확한 숫자 찾기 (우선순위 높음)
        const titlePattern = /title="([\d,]+)"/g;
        let titleMatches = [];
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
        
        // 3. JSON-LD 구조화된 데이터에서 찾기
        const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs;
        const jsonLdMatch = html.match(jsonLdPattern);
        if (jsonLdMatch) {
            for (const jsonStr of jsonLdMatch) {
                try {
                    const jsonData = JSON.parse(jsonStr.replace(/<\/?script[^>]*>/g, ''));
                    if (jsonData.interactionStatistic) {
                        for (const stat of jsonData.interactionStatistic) {
                            if (stat.name === 'Follows' || stat['@type'] === 'FollowAction') {
                                const count = stat.userInteractionCount;
                                if (count) {
                                    console.log(`Threads 팔로워 수 (JSON-LD): ${count}`);
                                    return parseInt(count) || 0;
                                }
                            }
                        }
                    }
                } catch (e) {
                    // JSON 파싱 실패 무시
                }
            }
        }
        
        // 4. 한글 "팔로워" 또는 영어 "Followers" 텍스트 근처 찾기
        const patterns = [
            /(\d{1,3}(?:,\d{3})*)\s*[Ff]ollowers/,
            /[Ff]ollowers[:\s]*(\d{1,3}(?:,\d{3})*)/,
            /팔로워\s*(\d{1,3}(?:,\d{3})*)/,
            /(\d{1,3}(?:,\d{3})*)\s*팔로워/,
            />([\d.]+[KMk]?)\s*[Ff]ollowers</
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                let number = match[1];
                // K, M 처리
                if (typeof number === 'string') {
                    if (number.includes('K') || number.includes('k')) {
                        number = parseFloat(number.replace(/[Kk]/g, '')) * 1000;
                    } else if (number.includes('M')) {
                        number = parseFloat(number.replace('M', '')) * 1000000;
                    } else {
                        // 콤마 제거하고 정수로 변환
                        number = parseInt(number.replace(/,/g, '').replace(/\./g, ''));
                    }
                }
                console.log(`Threads 팔로워 수 (패턴): ${number}`);
                return parseInt(number) || 0;
            }
        }
        
        // 5. title 속성 중 가장 큰 값 반환 (팔로워일 가능성 높음)
        if (titleMatches.length > 0) {
            const maxNum = Math.max(...titleMatches);
            console.log(`Threads 팔로워 수 (최대 title 값): ${maxNum}`);
            return maxNum;
        }

        console.log('Threads 팔로워 수를 찾을 수 없습니다');
        return 0;
    }

    // 배치 처리 기능
    const csvFile = document.getElementById('csvFile');
    const batchUrls = document.getElementById('batchUrls');
    const batchCheckBtn = document.getElementById('batchCheckBtn');
    const batchProgress = document.getElementById('batchProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const currentProcessing = document.getElementById('currentProcessing');
    const batchResults = document.getElementById('batchResults');
    const resultsBody = document.getElementById('resultsBody');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    
    // 구글 시트 연동 요소
    const googleSheetUrl = document.getElementById('googleSheetUrl');
    const loadSheetBtn = document.getElementById('loadSheetBtn');
    const sheetStatus = document.getElementById('sheetStatus');
    const rowCount = document.getElementById('rowCount');
    
    let batchResultsData = [];
    
    // 구글 시트 데이터 불러오기
    loadSheetBtn.addEventListener('click', async function() {
        const sheetUrl = googleSheetUrl.value.trim();
        if (!sheetUrl) {
            alert('구글 시트 URL을 입력해주세요!');
            return;
        }
        
        try {
            // 구글 시트 ID 추출
            const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            if (!sheetIdMatch) {
                alert('올바른 구글 시트 URL이 아닙니다!');
                return;
            }
            
            const sheetId = sheetIdMatch[1];
            
            // 구글 시트 API URL (공개 시트용) - 첫 번째 시트 사용
            const apiUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
            
            loadSheetBtn.disabled = true;
            loadSheetBtn.textContent = '불러오는 중...';
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error('구글 시트를 불러올 수 없습니다. 공개 설정을 확인해주세요.');
            }
            
            const csvText = await response.text();
            const { applicants, urls } = parseGoogleFormSheetCSV(csvText);
            
            if (urls.length === 0) {
                alert('URL을 찾을 수 없습니다. F열(Threads), G열(Instagram), H열(Blog)에 URL이 있는지 확인해주세요.');
                return;
            }
            
            // URL들을 텍스트 영역에 표시
            batchUrls.value = urls.join('\n');
            
            // 지원자 데이터를 전역 변수에 저장
            window.currentApplicants = applicants;
            
            // 상태 표시
            sheetStatus.style.display = 'block';
            rowCount.textContent = `(${applicants.length}명의 지원자, ${urls.length}개의 URL 발견)`;
            
            // 자동 스크롤
            batchUrls.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
        } catch (error) {
            console.error('구글 시트 로드 오류:', error);
            alert(`오류: ${error.message}\n\n구글 시트가 '링크가 있는 모든 사용자에게 공개'로 설정되어 있는지 확인해주세요.`);
        } finally {
            loadSheetBtn.disabled = false;
            loadSheetBtn.textContent = '구글 시트 불러오기';
        }
    });
    
    // 구글 폼 시트 CSV 파싱 (이름별 SNS 데이터 구조로 반환)
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
        
        // 첫 번째 행은 헤더로 간주하고 건너뛰기
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            const name = row[nameColumnIndex] ? row[nameColumnIndex].replace(/^"|"$/g, '').trim() : `지원자${i}`;
            
            const applicant = {
                name: name,
                rowIndex: i,
                sns: {
                    threads: null,
                    instagram: null,
                    blog: null
                }
            };
            
            // Threads URL (F열)
            const threadsUrl = row[threadsColumnIndex];
            if (threadsUrl && threadsUrl.trim()) {
                const cleanUrl = threadsUrl.replace(/^"|"$/g, '').trim();
                const normalizedUrl = normalizeUrl(cleanUrl);
                if (normalizedUrl && normalizedUrl.startsWith('http')) {
                    applicant.sns.threads = normalizedUrl;
                    urls.push(normalizedUrl);
                }
            }
            
            // Instagram URL (G열)
            const instagramUrl = row[instagramColumnIndex];
            if (instagramUrl && instagramUrl.trim()) {
                const cleanUrl = instagramUrl.replace(/^"|"$/g, '').trim();
                const normalizedUrl = normalizeUrl(cleanUrl);
                if (normalizedUrl && normalizedUrl.startsWith('http')) {
                    applicant.sns.instagram = normalizedUrl;
                    urls.push(normalizedUrl);
                }
            }
            
            // Blog URL (H열)
            const blogUrl = row[blogColumnIndex];
            if (blogUrl && blogUrl.trim()) {
                const cleanUrl = blogUrl.replace(/^"|"$/g, '').trim();
                const normalizedUrl = normalizeUrl(cleanUrl);
                if (normalizedUrl && normalizedUrl.startsWith('http')) {
                    applicant.sns.blog = normalizedUrl;
                    urls.push(normalizedUrl);
                }
            }
            
            // SNS가 하나라도 있는 경우만 추가
            if (applicant.sns.threads || applicant.sns.instagram || applicant.sns.blog) {
                applicants.push(applicant);
            }
        }
        
        return { applicants, urls };
    }
    
    // CSV 파일 읽기
    csvFile.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const text = e.target.result;
                // CSV를 텍스트 영역에 표시
                const lines = text.split('\n')
                    .map(line => line.trim())
                    .filter(line => line && line.startsWith('http'));
                batchUrls.value = lines.join('\n');
            };
            reader.readAsText(file);
        }
    });
    
    // 배치 처리 시작
    batchCheckBtn.addEventListener('click', async function() {
        const urlText = batchUrls.value.trim();
        if (!urlText) {
            alert('처리할 URL을 입력해주세요!');
            return;
        }
        
        const urls = urlText.split('\n')
            .map(input => input.trim())
            .filter(input => input)
            .map(input => normalizeUrl(input))
            .filter(url => url);
        
        if (urls.length === 0) {
            alert('유효한 URL이 없습니다!');
            return;
        }
        
        // 초기화
        batchResultsData = [];
        resultsBody.innerHTML = '';
        batchProgress.style.display = 'block';
        batchResults.style.display = 'none';
        batchCheckBtn.disabled = true;
        
        // 처리 시작
        const urlResults = new Map(); // URL별 결과 저장
        
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const progress = ((i + 1) / urls.length * 100).toFixed(0);
            
            progressBar.style.width = progress + '%';
            progressText.textContent = progress + '%';
            currentProcessing.textContent = `처리 중: ${url} (${i + 1}/${urls.length})`;
            
            try {
                const result = await processSingleUrl(url);
                urlResults.set(url, result);
                batchResultsData.push(result);
                addResultRow(result);
            } catch (error) {
                console.error('Error processing URL:', url, error);
                const errorResult = {
                    url: url,
                    platform: detectPlatform(url) || '알 수 없음',
                    followers: 0,
                    status: '오류',
                    error: error.message
                };
                urlResults.set(url, errorResult);
                batchResultsData.push(errorResult);
                addResultRow(errorResult);
            }
            
            // 서버 부하 방지를 위한 대기
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // 구글 시트에서 불러온 지원자 데이터가 있는 경우 이름별 집계
        if (window.currentApplicants && window.currentApplicants.length > 0) {
            addApplicantSummary(window.currentApplicants, urlResults);
        }
        
        // 완료
        batchProgress.style.display = 'none';
        batchResults.style.display = 'block';
        batchCheckBtn.disabled = false;
        
        const totalApplicants = window.currentApplicants ? window.currentApplicants.length : 0;
        if (totalApplicants > 0) {
            alert(`처리 완료! ${totalApplicants}명의 지원자, ${urls.length}개의 URL을 확인했습니다.`);
        } else {
            alert(`처리 완료! ${urls.length}개의 URL을 확인했습니다.`);
        }
    });
    
    // 단일 URL 처리
    async function processSingleUrl(url) {
        const platform = detectPlatform(url);
        if (!platform) {
            throw new Error('지원하지 않는 플랫폼');
        }
        
        let followers = 0;
        let status = '확인 중';
        
        // Playwright 사용 플랫폼
        if (platform === 'instagram' || platform === 'blog' || platform === 'threads') {
            const playwrightUrl = `http://localhost:3002/dynamic-proxy?url=${encodeURIComponent(url)}`;
            const response = await fetch(playwrightUrl);
            
            if (!response.ok) {
                throw new Error('서버 오류');
            }
            
            const html = await response.text();
            
            if (platform === 'instagram') {
                followers = extractInstagramFollowers(html);
            } else if (platform === 'threads') {
                followers = extractThreadsFollowers(html);
            } else if (platform === 'blog') {
                followers = extractBlogFollowers(html);
            }
        }
        
        // 상태 결정
        const minRequirement = platform === 'instagram' ? 1000 : 
                              platform === 'blog' ? 300 : 500;
        
        status = followers >= minRequirement ? '통과' : '미달';
        
        return {
            url: url,
            platform: platform === 'blog' ? '네이버 블로그' : 
                      platform === 'instagram' ? '인스타그램' : 'Threads',
            followers: followers,
            status: status,
            minRequirement: minRequirement
        };
    }
    
    // 지원자별 요약 테이블 추가
    function addApplicantSummary(applicants, urlResults) {
        // 기존 요약 섹션 제거
        const existingSummary = document.getElementById('applicantSummary');
        if (existingSummary) {
            existingSummary.remove();
        }
        
        // 요약 섹션 추가
        const summarySection = document.createElement('div');
        summarySection.id = 'applicantSummary';
        summarySection.style.cssText = 'margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;';
        
        summarySection.innerHTML = `
            <h3 style="margin-top: 0; color: #333;">📋 지원자별 심사 결과</h3>
            <div style="overflow-x: auto;">
                <table id="applicantTable" style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <thead>
                        <tr style="background: #667eea; color: white;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">이름</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Threads<br><small>(500명 이상)</small></th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Instagram<br><small>(1,000명 이상)</small></th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Blog<br><small>(300명 이상)</small></th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: bold;">최종 결과</th>
                        </tr>
                    </thead>
                    <tbody id="applicantTableBody"></tbody>
                </table>
            </div>
            <div style="margin-top: 15px;">
                <button id="downloadApplicantCsvBtn" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">지원자 결과 CSV 다운로드</button>
            </div>
        `;
        
        // 기존 결과 테이블 다음에 추가
        const batchResults = document.getElementById('batchResults');
        batchResults.appendChild(summarySection);
        
        const applicantTableBody = document.getElementById('applicantTableBody');
        const applicantResultsData = [];
        
        // 각 지원자별로 결과 집계
        applicants.forEach(applicant => {
            const applicantResult = {
                name: applicant.name,
                sns: {
                    threads: { url: applicant.sns.threads, followers: 0, status: '없음' },
                    instagram: { url: applicant.sns.instagram, followers: 0, status: '없음' },
                    blog: { url: applicant.sns.blog, followers: 0, status: '없음' }
                },
                finalStatus: '비선정'
            };
            
            let passCount = 0;
            let totalSns = 0;
            
            // Threads 결과 확인
            if (applicant.sns.threads) {
                totalSns++;
                const threadsResult = urlResults.get(applicant.sns.threads);
                if (threadsResult) {
                    applicantResult.sns.threads.followers = threadsResult.followers;
                    applicantResult.sns.threads.status = threadsResult.status;
                    if (threadsResult.status === '통과') passCount++;
                }
            }
            
            // Instagram 결과 확인
            if (applicant.sns.instagram) {
                totalSns++;
                const instagramResult = urlResults.get(applicant.sns.instagram);
                if (instagramResult) {
                    applicantResult.sns.instagram.followers = instagramResult.followers;
                    applicantResult.sns.instagram.status = instagramResult.status;
                    if (instagramResult.status === '통과') passCount++;
                }
            }
            
            // Blog 결과 확인
            if (applicant.sns.blog) {
                totalSns++;
                const blogResult = urlResults.get(applicant.sns.blog);
                if (blogResult) {
                    applicantResult.sns.blog.followers = blogResult.followers;
                    applicantResult.sns.blog.status = blogResult.status;
                    if (blogResult.status === '통과') passCount++;
                }
            }
            
            // 최종 선정 기준: 제출한 SNS 중 모두 통과해야 선정
            if (totalSns > 0 && passCount === totalSns) {
                applicantResult.finalStatus = '선정';
            }
            
            applicantResultsData.push(applicantResult);
            addApplicantRow(applicantResult);
        });
        
        // CSV 다운로드 이벤트 추가
        document.getElementById('downloadApplicantCsvBtn').addEventListener('click', function() {
            downloadApplicantCSV(applicantResultsData);
        });
        
        // 통계 표시
        const selectedCount = applicantResultsData.filter(a => a.finalStatus === '선정').length;
        const totalCount = applicantResultsData.length;
        
        const statsDiv = document.createElement('div');
        statsDiv.style.cssText = 'margin-top: 15px; padding: 10px; background: white; border-radius: 5px; text-align: center; font-weight: bold;';
        statsDiv.innerHTML = `
            📊 선정 통계: <span style="color: #28a745;">${selectedCount}명 선정</span> / 
            <span style="color: #dc3545;">${totalCount - selectedCount}명 비선정</span> 
            (총 ${totalCount}명)
        `;
        summarySection.appendChild(statsDiv);
    }
    
    // 지원자 결과 행 추가
    function addApplicantRow(applicantResult) {
        const tbody = document.getElementById('applicantTableBody');
        const row = document.createElement('tr');
        
        const finalStatusStyle = applicantResult.finalStatus === '선정' ? 
            'background: #d4edda; color: #155724; font-weight: bold;' : 
            'background: #f8d7da; color: #721c24;';
        
        const getSnsCell = (sns) => {
            if (sns.url) {
                const statusColor = sns.status === '통과' ? '#28a745' : 
                                  sns.status === '미달' ? '#dc3545' : '#6c757d';
                return `
                    <div style="font-size: 12px;">
                        <div style="color: ${statusColor}; font-weight: bold;">${sns.status}</div>
                        <div>${sns.followers.toLocaleString()}명</div>
                    </div>
                `;
            } else {
                return '<div style="color: #6c757d; font-size: 12px;">미제출</div>';
            }
        };
        
        row.innerHTML = `
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${applicantResult.name}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${getSnsCell(applicantResult.sns.threads)}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${getSnsCell(applicantResult.sns.instagram)}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${getSnsCell(applicantResult.sns.blog)}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; ${finalStatusStyle}">${applicantResult.finalStatus}</td>
        `;
        
        tbody.appendChild(row);
    }
    
    // 지원자 결과 CSV 다운로드
    function downloadApplicantCSV(applicantResultsData) {
        let csvContent = '이름,Threads팔로워,Threads상태,Instagram팔로워,Instagram상태,Blog이웃,Blog상태,최종결과\n';
        
        applicantResultsData.forEach(result => {
            const threadsFollowers = result.sns.threads.url ? result.sns.threads.followers : 0;
            const threadsStatus = result.sns.threads.url ? result.sns.threads.status : '미제출';
            const instagramFollowers = result.sns.instagram.url ? result.sns.instagram.followers : 0;
            const instagramStatus = result.sns.instagram.url ? result.sns.instagram.status : '미제출';
            const blogFollowers = result.sns.blog.url ? result.sns.blog.followers : 0;
            const blogStatus = result.sns.blog.url ? result.sns.blog.status : '미제출';
            
            csvContent += `"${result.name}",${threadsFollowers},"${threadsStatus}",${instagramFollowers},"${instagramStatus}",${blogFollowers},"${blogStatus}","${result.finalStatus}"\n`;
        });
        
        // BOM 추가 (한글 깨짐 방지)
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `지원자_심사결과_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 결과 행 추가
    function addResultRow(result) {
        const row = document.createElement('tr');
        const statusClass = result.status === '통과' ? 'color: #155724; font-weight: bold;' : 
                           result.status === '미달' ? 'color: #721c24;' : 'color: #856404;';
        
        row.innerHTML = `
            <td style="padding: 10px; border: 1px solid #ddd; word-break: break-all;">
                <a href="${result.url}" target="_blank" style="color: #667eea; text-decoration: none;">${result.url}</a>
            </td>
            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${result.platform}</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${result.followers.toLocaleString()}명</td>
            <td style="padding: 10px; text-align: center; border: 1px solid #ddd; ${statusClass}">${result.status}</td>
        `;
        resultsBody.appendChild(row);
    }
    
    // CSV 다운로드
    downloadCsvBtn.addEventListener('click', function() {
        if (batchResultsData.length === 0) {
            alert('다운로드할 결과가 없습니다!');
            return;
        }
        
        // CSV 생성
        let csvContent = 'URL,플랫폼,팔로워/이웃수,최소기준,상태\n';
        batchResultsData.forEach(result => {
            csvContent += `"${result.url}","${result.platform}",${result.followers},${result.minRequirement || ''},"${result.status}"\n`;
        });
        
        // BOM 추가 (한글 깨짐 방지)
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `sns_followers_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});