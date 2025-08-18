// Measure API 테스트
const testMeasure = async () => {
  console.log('=== Measure API 테스트 시작 ===\n');
  
  const testCases = [
    {
      name: 'Threads 계정 테스트',
      data: {
        candidate: {
          name: '남인수',
          email: 'test@example.com',
          threadsUrl: 'https://www.threads.com/@naminsoo_ai',
          instagramUrl: '',
          blogUrl: ''
        },
        criteria: {
          threads: 500,
          blog: 300,
          instagram: 1000
        },
        channel: 'threads'
      }
    },
    {
      name: '모든 채널 테스트',
      data: {
        candidate: {
          name: '테스트',
          threadsUrl: 'https://www.threads.com/@naminsoo_ai',
          instagramUrl: 'https://www.instagram.com/cristiano',
          blogUrl: 'https://blog.naver.com/marketinginsite'
        },
        criteria: {
          threads: 10000,
          blog: 300,
          instagram: 1000
        },
        channel: 'all'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n테스트: ${testCase.name}`);
    console.log('요청 데이터:', JSON.stringify(testCase.data, null, 2));
    
    try {
      const response = await fetch('http://localhost:3001/api/sheets/measure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data)
      });
      
      console.log('응답 상태:', response.status, response.statusText);
      
      const result = await response.json();
      console.log('응답 데이터:', JSON.stringify(result, null, 2));
      
      if (result.error) {
        console.error('❌ 에러:', result.error);
      } else {
        console.log('✅ 성공!');
        console.log(`  - Threads: ${result.threads ? result.threads.toLocaleString() : 0}`);
        console.log(`  - Instagram: ${result.instagram ? result.instagram.toLocaleString() : 0}`);
        console.log(`  - Blog: ${result.blog ? result.blog.toLocaleString() : 0}`);
        console.log(`  - 선정 여부: ${result.selected ? '✅ 선정' : '❌ 미선정'}`);
      }
      
    } catch (error) {
      console.error('❌ 요청 실패:', error.message);
    }
    
    console.log('\n' + '='.repeat(50));
  }
  
  console.log('\n=== 테스트 완료 ===');
};

// 테스트 실행
testMeasure().catch(console.error);