// 네이버 블로그 이웃수 추출 테스트
const testBlog = async () => {
  console.log('=== 네이버 블로그 이웃수 테스트 시작 ===\n');
  
  const testUrls = [
    'https://blog.naver.com/marketinginsite',
    'https://blog.naver.com/peppermintday',
    'https://blog.naver.com/jisanresort',
    'https://blog.naver.com/necomeishi'
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
      console.log(`이웃수: ${data.followers ? data.followers.toLocaleString() : '0'}`);
      
      if (data.debug) {
        console.log('\n=== 디버그 정보 ===');
        console.log(`HTML 길이: ${data.debug.htmlLength}`);
        console.log(`타임스탬프: ${data.debug.timestamp}`);
      }
      
      if (data.error) {
        console.error('에러:', data.error);
        console.error('상세:', data.details);
      }
      
      // HTML에서 NAVER_BLOG_FOLLOWERS 태그 확인
      if (data.html && data.html.includes('NAVER_BLOG_FOLLOWERS')) {
        const match = data.html.match(/<!-- NAVER_BLOG_FOLLOWERS: ([\d,]+) -->/);
        if (match) {
          console.log(`\n✅ 추출된 이웃수: ${match[1]}`);
        }
      }
      
      if (data.followers === 0) {
        console.log('\n⚠️ 이웃수를 찾을 수 없음');
      } else {
        console.log(`\n✅ 성공! ${data.followers.toLocaleString()}명의 이웃`);
      }
      
    } catch (error) {
      console.error('요청 실패:', error.message);
    }
    
    console.log('\n' + '='.repeat(50));
    
    // API 부하 방지를 위한 딜레이
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n=== 테스트 완료 ===');
};

// 테스트 실행
testBlog().catch(console.error);