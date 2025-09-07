// Threads 스크래핑 테스트
const testThreads = async () => {
  console.log('=== Threads 스크래핑 테스트 시작 ===\n');
  
  // 테스트할 Threads URL 목록
  const testUrls = [
    'https://www.threads.com/@naminsoo_ai',
    'https://www.threads.com/@fcbarcelona',
    'https://www.threads.com/@zuck'
  ];
  
  for (const url of testUrls) {
    console.log(`\n테스트 URL: ${url}`);
    console.log('요청 전송 중...');
    
    try {
      const response = await fetch('http://localhost:3001/api/sns/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      
      console.log('\n=== 응답 결과 ===');
      console.log(`플랫폼: ${data.platform}`);
      console.log(`팔로워: ${data.followers ? data.followers.toLocaleString() : '0'}`);
      
      if (data.debug) {
        console.log('\n=== 디버그 정보 ===');
        console.log(`HTML 길이: ${data.debug.htmlLength}`);
        console.log(`팔로워 텍스트 포함: ${data.debug.hasFollowerText}`);
        console.log(`타임스탬프: ${data.debug.timestamp}`);
      }
      
      if (data.error) {
        console.error('에러:', data.error);
        console.error('상세:', data.details);
      }
      
      // HTML 샘플 출력 (디버그용)
      if (data.html) {
        console.log('\n=== HTML 샘플 (처음 200자) ===');
        console.log(data.html.substring(0, 200) + '...');
        
        // title 속성 찾기
        const titleMatches = data.html.match(/title="[\d,]+"/g);
        if (titleMatches) {
          console.log('\n=== 발견된 title 속성들 ===');
          titleMatches.slice(0, 5).forEach(match => {
            console.log(`  ${match}`);
          });
        }
      }
      
    } catch (error) {
      console.error('요청 실패:', error.message);
    }
    
    console.log('\n' + '='.repeat(50));
  }
  
  console.log('\n=== 테스트 완료 ===');
};

// 테스트 실행
testThreads().catch(console.error);