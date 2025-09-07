// URL 정규화 테스트
const testUrlNormalization = async () => {
  const testCases = [
    // Threads 테스트
    { input: '@zuck', expected: 'threads' },
    { input: 'zuck', expected: 'threads' },
    { input: 'https://www.threads.net/@zuck', expected: 'threads' },
    { input: '@nike', expected: 'threads' },
    { input: 'netflix', expected: 'threads' },
    
    // Instagram 테스트 (명시적 표시 필요)
    { input: 'instagram.com/nike', expected: 'instagram' },
    { input: 'ig.nike', expected: 'instagram' },
    
    // 네이버 블로그 테스트 (명시적 표시 필요)
    { input: 'blog.naver.com/myblog', expected: 'naver_blog' },
    { input: 'naverblog123', expected: 'naver_blog' }
  ];
  
  console.log('🧪 URL 정규화 테스트 시작\n');
  console.log('=' .repeat(60));
  
  for (const testCase of testCases) {
    console.log(`\n📝 입력: "${testCase.input}"`);
    console.log(`   예상 플랫폼: ${testCase.expected}`);
    console.log('-'.repeat(60));
    
    try {
      const response = await fetch('http://localhost:3001/api/sns/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: testCase.input })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('✅ 응답:');
      console.log(`   - 플랫폼: ${data.platform}`);
      console.log(`   - 팔로워: ${data.followers ? data.followers.toLocaleString() : '없음'}`);
      
      if (data.platform === testCase.expected) {
        console.log('   ✨ 플랫폼 감지 성공!');
      } else {
        console.log(`   ⚠️ 플랫폼 불일치 (받은 값: ${data.platform})`);
      }
      
      if (data.followers && data.followers > 0) {
        console.log('   ✨ 팔로워 추출 성공!');
      }
      
    } catch (error) {
      console.error(`❌ 오류: ${error.message}`);
    }
    
    // 다음 요청 전 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 모든 테스트 완료!\n');
};

// 간단한 정규화 테스트 (API 호출 없이)
const testNormalizationLogic = () => {
  console.log('\n📐 정규화 로직 테스트 (API 호출 없음)\n');
  console.log('=' .repeat(60));
  
  const testInputs = [
    '@zuck',
    'zuck',
    '  @nike  ',
    'https://www.threads.net/@test',
    'instagram.com/test',
    'blog.naver.com/test',
    'myblogname'
  ];
  
  testInputs.forEach(input => {
    // 간단한 정규화 로직 시뮬레이션
    let normalized = input.trim();
    
    if (!normalized.startsWith('http')) {
      const username = normalized.startsWith('@') ? normalized.substring(1) : normalized;
      
      if (username.includes('instagram') || username.includes('ig.')) {
        normalized = `https://www.instagram.com/${username.replace('instagram.com/', '')}`;
      } else if (username.includes('blog') || username.includes('naver')) {
        normalized = `https://blog.naver.com/${username.replace('blog.naver.com/', '')}`;
      } else {
        normalized = `https://www.threads.net/@${username}`;
      }
    }
    
    console.log(`입력: "${input}" → 정규화: "${normalized}"`);
  });
  
  console.log('\n' + '='.repeat(60));
};

// 로직 테스트 먼저 실행
testNormalizationLogic();

// API 테스트 실행
console.log('\n🚀 API 테스트 시작 (3초 후)...\n');
setTimeout(() => {
  testUrlNormalization().catch(console.error);
}, 3000);