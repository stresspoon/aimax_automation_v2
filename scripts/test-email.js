#!/usr/bin/env node

/**
 * Gmail API 이메일 발송 테스트 스크립트
 * 
 * 사용법:
 * 1. 먼저 로컬 서버가 실행 중이어야 합니다 (npm run dev)
 * 2. 브라우저에서 로그인하여 Gmail 연동이 되어 있어야 합니다
 * 3. node scripts/test-email.js 실행
 */

const https = require('https');

// 테스트 이메일 데이터
const testEmailData = {
  recipients: ['stresspoon@gmail.com'],
  subject: 'AIMAX 이메일 본문 테스트',
  body: `안녕하세요!

이것은 AIMAX에서 발송하는 테스트 이메일입니다.

<strong>HTML 형식</strong>도 잘 표시되는지 확인합니다.

다음 내용이 포함되어 있습니다:
- 한글 텍스트
- HTML 태그
- 여러 줄의 내용

테스트 시간: ${new Date().toLocaleString('ko-KR')}

감사합니다.
AIMAX Team`,
  replyTo: 'noreply@aimax.kr'
};

// API 호출 함수
function callAPI(path, method, data, cookie) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(cookie ? { 'Cookie': cookie } : {})
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function testEmailSending() {
  console.log('🚀 Gmail 이메일 발송 테스트 시작...\n');
  
  try {
    // 1. 먼저 로그인 (테스트 계정 사용)
    console.log('1️⃣ 로그인 시도...');
    const loginResponse = await callAPI('/api/auth/login', 'POST', {
      email: 'admin@aimax.kr', // 또는 Gmail이 연동된 계정
      password: 'Test123!@#' // 실제 비밀번호로 변경 필요
    });

    if (loginResponse.status !== 200) {
      console.error('❌ 로그인 실패:', loginResponse.data);
      console.log('\n💡 브라우저에서 직접 로그인한 후 쿠키를 사용하려면:');
      console.log('1. 브라우저에서 로그인');
      console.log('2. 개발자 도구 > Application > Cookies에서 쿠키 값 복사');
      console.log('3. 이 스크립트의 cookie 변수에 붙여넣기');
      return;
    }

    // 쿠키 추출
    const cookies = loginResponse.headers['set-cookie'];
    const cookie = cookies ? cookies.join('; ') : '';
    
    console.log('✅ 로그인 성공\n');

    // 2. Gmail 연동 확인
    console.log('2️⃣ Gmail 연동 상태 확인...');
    // 실제로는 별도의 API 엔드포인트가 필요할 수 있음
    
    // 3. 이메일 발송
    console.log('3️⃣ 이메일 발송 중...');
    console.log('📧 수신자:', testEmailData.recipients[0]);
    console.log('📝 제목:', testEmailData.subject);
    console.log('📄 본문 길이:', testEmailData.body.length, '자\n');
    
    const emailResponse = await callAPI('/api/emails/send-gmail', 'POST', testEmailData, cookie);
    
    if (emailResponse.status === 200) {
      console.log('✅ 이메일 발송 성공!');
      console.log('결과:', JSON.stringify(emailResponse.data, null, 2));
      
      if (emailResponse.data.results && emailResponse.data.results.length > 0) {
        console.log('\n📬 발송 상세:');
        emailResponse.data.results.forEach(r => {
          console.log(`  - ${r.recipient}: ${r.status} (ID: ${r.messageId})`);
        });
      }
    } else {
      console.error('❌ 이메일 발송 실패:');
      console.error('상태 코드:', emailResponse.status);
      console.error('응답:', JSON.stringify(emailResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    console.log('\n💡 다음을 확인해주세요:');
    console.log('1. 로컬 서버가 실행 중인지 (npm run dev)');
    console.log('2. Gmail이 연동되어 있는지');
    console.log('3. 네트워크 연결 상태');
  }
}

// 메인 실행
console.log('='.repeat(50));
console.log('Gmail 이메일 발송 테스트 스크립트');
console.log('='.repeat(50));
console.log();

testEmailSending().then(() => {
  console.log('\n테스트 완료');
  process.exit(0);
}).catch(err => {
  console.error('\n테스트 실패:', err);
  process.exit(1);
});