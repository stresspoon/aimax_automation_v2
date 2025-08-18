// SNS 팔로워 추출 디버그 테스트
const testDebug = async () => {
  const testCases = [
    // Instagram 테스트
    { 
      url: 'https://www.instagram.com/cristiano',
      expected: 'instagram',
      desc: 'Instagram - Cristiano (전체 URL)'
    },
    { 
      url: '@cristiano',
      expected: 'threads', // 기본값은 threads
      desc: 'Instagram - @cristiano (threads로 인식될 것)'
    },
    { 
      url: 'instagram.com/cristiano',
      expected: 'instagram',
      desc: 'Instagram - 도메인 포함'
    },
    
    // Threads 테스트
    { 
      url: 'https://www.threads.net/@zuck',
      expected: 'threads',
      desc: 'Threads - Zuck'
    },
    { 
      url: 'zuck',
      expected: 'threads',
      desc: 'Threads - 아이디만'
    }
  ];
  
  console.log('🔍 SNS 팔로워 추출 디버그 테스트\n');
  console.log('=' .repeat(70));
  
  for (const test of testCases) {
    console.log(`\n📌 테스트: ${test.desc}`);
    console.log(`   URL: ${test.url}`);
    console.log(`   예상 플랫폼: ${test.expected}`);
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
      
      console.log('\n📊 응답 결과:');
      console.log(`   플랫폼: ${data.platform} ${data.platform === test.expected ? '✅' : '❌'}`);
      console.log(`   팔로워: ${data.followers ? data.followers.toLocaleString() : '0'} ${data.followers > 0 ? '✅' : '❌'}`);
      
      if (data.debug) {
        console.log('\n🔍 디버그 정보:');
        console.log(`   - 정규화된 URL: ${data.debug.normalizedUrl}`);
        console.log(`   - 원본 입력: ${data.debug.originalUrl}`);
        console.log(`   - HTML 길이: ${data.debug.htmlLength}`);
        console.log(`   - 팔로워 텍스트 존재: ${data.debug.hasFollowerText}`);
        
        // Instagram 특별 디버그
        if (data.platform === 'instagram') {
          console.log('\n   📸 Instagram 특별 디버그:');
          if (data.debug.titleAttributesFound) {
            console.log(`   - title 속성들: ${data.debug.titleAttributesFound.join(', ')}`);
          }
          if (data.debug.metaDescription) {
            console.log(`   - Meta description: ${data.debug.metaDescription.substring(0, 100)}...`);
          }
          if (data.debug.extractedValue) {
            console.log(`   - 추출된 값: ${data.debug.extractedValue}`);
          }
        }
      }
      
      // 팔로워가 0인 경우 HTML 샘플 확인
      if (data.followers === 0 || data.followers === 4) {
        console.log('\n⚠️ 문제 발견! HTML 샘플:');
        console.log(data.html.substring(0, 500));
        
        // title 속성 직접 검색
        const titleMatches = data.html.match(/title="([\d,]+)"/g);
        if (titleMatches) {
          console.log('\n   HTML에서 찾은 title 속성:');
          titleMatches.slice(0, 5).forEach(match => {
            console.log(`   - ${match}`);
          });
        }
      }
      
    } catch (error) {
      console.error(`\n❌ 오류: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(70));
    
    // API 제한 방지
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n✅ 디버그 테스트 완료!\n');
};

// 테스트 실행
testDebug().catch(console.error);