// 최종 통합 테스트
const testFinal = async () => {
  const testCases = [
    // Threads 테스트 (threads.com)
    { url: 'https://www.threads.com/@naminsoo_ai', expected: '남인수 AI' },
    { url: '@naminsoo_ai', expected: '남인수 (아이디만)' },
    { url: 'naminsoo_ai', expected: '남인수 (@ 없이)' },
    
    // Instagram 테스트
    { url: 'https://www.instagram.com/nike', expected: 'Nike Instagram' },
    { url: 'instagram.com/nike', expected: 'Nike (도메인)' },
    
    // 네이버 블로그
    { url: 'blog.naver.com/myblog', expected: '네이버 블로그' }
  ];
  
  console.log('🎯 최종 통합 테스트\n');
  console.log('=' .repeat(60));
  
  for (const test of testCases) {
    console.log(`\n📍 테스트: ${test.expected}`);
    console.log(`   URL: ${test.url}`);
    console.log('-'.repeat(60));
    
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
      
      console.log('✅ 결과:');
      console.log(`   플랫폼: ${data.platform}`);
      console.log(`   팔로워: ${data.followers ? data.followers.toLocaleString() : '0'}`);
      console.log(`   정규화: ${data.debug?.normalizedUrl}`);
      
      if (data.followers > 0) {
        console.log('   ✨ 성공!');
      } else if (data.followers === 0) {
        console.log('   ⚠️ 팔로워 0 - 확인 필요');
      }
      
    } catch (error) {
      console.error(`❌ 오류: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 테스트 완료!\n');
};

testFinal().catch(console.error);