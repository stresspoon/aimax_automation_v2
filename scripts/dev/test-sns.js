// SNS 스크래핑 테스트 스크립트
async function testSNSScraping() {
  const testUrls = [
    'https://www.threads.net/@zuck',  // Mark Zuckerberg - 많은 팔로워
    'https://www.threads.net/@lorora_gyuri',  // 실제 DB에 있는 URL
    'https://www.threads.net/@na._.roo',  // 실제 DB에 있는 URL
  ];

  console.log('🧪 SNS 스크래핑 테스트 시작\n');

  for (const url of testUrls) {
    console.log(`\n📍 테스트 URL: ${url}`);
    console.log('-------------------------------------------');
    
    try {
      const response = await fetch('http://localhost:3001/api/sns/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        console.error(`❌ HTTP 에러: ${response.status}`);
        const error = await response.text();
        console.error(error);
        continue;
      }

      const data = await response.json();
      console.log('\n📊 응답 데이터:');
      console.log(`  플랫폼: ${data.platform}`);
      console.log(`  팔로워: ${data.followers}`);
      console.log(`  디버그 정보:`, data.debug);
      
      if (data.followers === 0) {
        console.log('\n⚠️ 팔로워가 0입니다! HTML 샘플 확인:');
        console.log(data.html.substring(0, 200));
      } else {
        console.log(`\n✅ 성공! ${data.followers}명의 팔로워 감지`);
      }
    } catch (error) {
      console.error(`❌ 요청 실패:`, error.message);
    }
    
    // 요청 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n\n🧪 테스트 완료');
}

// 실행
testSNSScraping().catch(console.error);