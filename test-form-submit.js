// 폼 제출 테스트
const testFormSubmit = async () => {
  console.log('📝 폼 제출 테스트 시작');
  
  const formData = {
    name: '테스트 사용자',
    email: 'test@example.com',
    phone: '010-1234-5678',
    source: '테스트',
    threadsUrl: 'https://www.threads.com/@just_followtax',
    instagramUrl: 'https://www.instagram.com/test',
    blogUrl: 'https://blog.naver.com/test',
    privacyAgreed: true
  };
  
  try {
    // 먼저 폼 슬러그 찾기 (이미 생성된 폼 사용)
    const formSlug = 'f504c7a5'; // 기존 폼 슬러그
    
    const response = await fetch(`http://localhost:3001/api/forms/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        formId: formSlug,
        data: formData
      })
    });
    
    const result = await response.json();
    console.log('📨 응답:', result);
    
    if (result.success) {
      console.log('✅ 폼 제출 성공! Response ID:', result.responseId);
      console.log('⏳ SNS 체크 처리 중... (백그라운드에서 진행)');
    } else {
      console.error('❌ 폼 제출 실패:', result.error);
    }
  } catch (error) {
    console.error('❌ 요청 실패:', error.message);
  }
};

testFormSubmit();
