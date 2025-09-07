// URL 정규화 테스트
const testNormalize = async () => {
  console.log('=== URL 정규화 테스트 시작 ===\n');
  
  const testCases = [
    {
      name: '@ 포함 아이디만 입력',
      data: {
        candidate: {
          name: '테스트1',
          threadsUrl: '@naminsoo_ai',
          instagramUrl: '@cristiano',
          blogUrl: ''
        },
        criteria: { threads: 500, instagram: 1000 },
        channel: 'all'
      }
    },
    {
      name: '@ 없이 아이디만 입력',
      data: {
        candidate: {
          name: '테스트2',
          threadsUrl: 'naminsoo_ai',
          instagramUrl: 'cristiano',
          blogUrl: 'marketinginsite'
        },
        criteria: { threads: 500, instagram: 1000, blog: 300 },
        channel: 'all'
      }
    },
    {
      name: '완전한 URL 입력',
      data: {
        candidate: {
          name: '테스트3',
          threadsUrl: 'https://www.threads.com/@zuck',
          instagramUrl: 'https://www.instagram.com/cristiano',
          blogUrl: ''
        },
        criteria: { threads: 500, instagram: 1000 },
        channel: 'all'
      }
    },
    {
      name: '혼합 형식 입력',
      data: {
        candidate: {
          name: '테스트4',
          threadsUrl: '@fcbarcelona',  // @ 포함
          instagramUrl: 'leomessi',     // 아이디만
          blogUrl: 'https://blog.naver.com/marketinginsite'  // 완전한 URL
        },
        criteria: { threads: 500, instagram: 1000, blog: 300 },
        channel: 'all'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n테스트: ${testCase.name}`);
    console.log('입력 데이터:');
    console.log(`  - Threads: "${testCase.data.candidate.threadsUrl}"`);
    console.log(`  - Instagram: "${testCase.data.candidate.instagramUrl}"`);
    console.log(`  - Blog: "${testCase.data.candidate.blogUrl}"`);
    
    try {
      const response = await fetch('http://localhost:3001/api/sheets/measure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data)
      });
      
      if (!response.ok) {
        console.error('❌ 응답 실패:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('에러 내용:', errorText);
        continue;
      }
      
      const result = await response.json();
      
      if (result.error) {
        console.error('❌ 에러:', result.error);
      } else {
        console.log('\n✅ 성공! 추출된 팔로워 수:');
        if (result.threads > 0) {
          console.log(`  - Threads: ${result.threads.toLocaleString()}명`);
        }
        if (result.instagram > 0) {
          console.log(`  - Instagram: ${result.instagram.toLocaleString()}명`);
        }
        if (result.blog > 0) {
          console.log(`  - Blog: ${result.blog.toLocaleString()}명`);
        }
        console.log(`  - 선정 여부: ${result.selected ? '✅ 선정' : '❌ 미선정'}`);
      }
      
    } catch (error) {
      console.error('❌ 요청 실패:', error.message);
    }
    
    console.log('\n' + '='.repeat(50));
    
    // API 부하 방지를 위한 딜레이
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n=== 테스트 완료 ===');
};

// 테스트 실행
testNormalize().catch(console.error);