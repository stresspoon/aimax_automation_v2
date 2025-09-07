// Threads 팔로워 추출 개선 테스트
const testThreadsExtraction = async () => {
  const testUrls = [
    'https://www.threads.net/@zuck',
    'https://www.threads.net/@nike',
    'https://www.threads.net/@netflix'
  ];
  
  console.log('🚀 Threads 팔로워 추출 테스트 시작\n');
  console.log('=' .repeat(50));
  
  for (const url of testUrls) {
    console.log(`\n📍 테스트 URL: ${url}`);
    console.log('-'.repeat(50));
    
    try {
      const response = await fetch('http://localhost:3001/api/sns/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('✅ 응답 데이터:');
      console.log(`  - 플랫폼: ${data.platform}`);
      console.log(`  - 팔로워: ${data.followers ? data.followers.toLocaleString() : '없음'}`);
      
      if (data.debug) {
        console.log('  - 디버그 정보:');
        console.log(`    - HTML 길이: ${data.debug.htmlLength}`);
        console.log(`    - 팔로워 텍스트 존재: ${data.debug.hasFollowerText}`);
        console.log(`    - 타임스탬프: ${data.debug.timestamp}`);
      }
      
      if (data.followers > 0) {
        console.log('  ✨ 팔로워 추출 성공!');
      } else {
        console.log('  ⚠️ 팔로워를 찾을 수 없음');
      }
      
    } catch (error) {
      console.error(`❌ 오류 발생: ${error.message}`);
    }
    
    // 다음 요청 전 짧은 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ 모든 테스트 완료!\n');
};

// 테스트 실행
testThreadsExtraction().catch(console.error);