// 실패 원인 분석 테스트
const testFailureAnalysis = async () => {
  const testCases = [
    // 실패할 가능성이 있는 케이스들
    { url: '@cristiano', desc: 'Threads로 잘못 인식되는 Instagram 계정' },
    { url: 'nonexistentuser12345', desc: '존재하지 않는 계정' },
    { url: 'blog.naver.com/nonexistent', desc: '존재하지 않는 블로그' },
    { url: 'private_account_test', desc: '비공개 계정 (있다면)' },
    
    // 성공해야 하는 케이스
    { url: 'https://www.threads.com/@zuck', desc: 'Threads 정상 계정' },
    { url: 'https://www.instagram.com/nike', desc: 'Instagram 정상 계정' }
  ];
  
  console.log('🔍 실패 원인 분석 테스트\n');
  console.log('=' .repeat(70));
  
  for (const test of testCases) {
    console.log(`\n📌 테스트: ${test.desc}`);
    console.log(`   URL: ${test.url}`);
    console.log('-'.repeat(70));
    
    try {
      const response = await fetch('http://localhost:3001/api/sns/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: test.url })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('\n📊 결과:');
      console.log(`   플랫폼: ${data.platform}`);
      console.log(`   팔로워: ${data.followers ? data.followers.toLocaleString() : '0'}`);
      console.log(`   성공 여부: ${data.debug?.success ? '✅ 성공' : '❌ 실패'}`);
      
      // 실패한 경우 상세 원인 표시
      if (!data.debug?.success && data.debug?.failureReason) {
        console.log('\n❌ 실패 원인:');
        console.log(`   ${data.debug.failureReason}`);
        
        if (data.debug.extractionAttempts && data.debug.extractionAttempts.length > 0) {
          console.log('\n🔍 추출 시도 내역:');
          data.debug.extractionAttempts.forEach(attempt => {
            const status = attempt.found ? '✓' : '✗';
            console.log(`   ${status} ${attempt.method}: ${attempt.detail}`);
          });
        }
      }
      
      // 성공한 경우
      if (data.debug?.success) {
        console.log(`   ✨ 팔로워 추출 성공!`);
      }
      
      // 추가 디버그 정보
      if (data.debug) {
        console.log('\n📝 추가 정보:');
        console.log(`   - HTML 길이: ${data.debug.htmlLength}`);
        console.log(`   - 정규화된 URL: ${data.debug.normalizedUrl}`);
        console.log(`   - 팔로워 텍스트 존재: ${data.debug.hasFollowerText ? '예' : '아니오'}`);
      }
      
    } catch (error) {
      console.error(`\n❌ 요청 오류: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(70));
    
    // API 제한 방지
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n✅ 실패 원인 분석 테스트 완료!\n');
};

// 테스트 실행
testFailureAnalysis().catch(console.error);