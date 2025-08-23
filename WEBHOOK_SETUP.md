# Google Sheets 실시간 연동 설정 가이드

## 방법 1: Google Forms 사용 (추천) ✅

Google Forms를 사용하면 웹훅 없이도 실시간 응답을 받을 수 있습니다.

### 설정 방법:
1. Google Forms 생성
2. 필드 추가:
   - 성함 (단답형)
   - 이메일 (단답형)
   - 연락처 (단답형)
   - 스레드 URL (단답형)
   - 인스타그램 URL (단답형)
   - 블로그 URL (단답형)

3. 응답을 Google Sheets에 연결
4. AIMAX에서 해당 Sheets URL 입력

### 장점:
- 설정 간단
- 실시간 자동 수집
- 무료
- 폼 공유 링크로 쉽게 배포

---

## 방법 2: Zapier 연동 (무료 100회/월)

### 설정 방법:
1. Zapier 계정 생성 (무료)
2. 새 Zap 만들기:
   - Trigger: Google Sheets - New Row
   - Action: Webhooks by Zapier - POST
   - URL: `https://aimax-automation-v2.vercel.app/api/sheets/webhook`
   - Body: 
   ```json
   {
     "projectId": "YOUR_PROJECT_ID",
     "sheetUrl": "YOUR_SHEET_URL",
     "newRow": {
       "name": "{{name}}",
       "email": "{{email}}",
       "phone": "{{phone}}",
       "threadsUrl": "{{threadsUrl}}",
       "instagramUrl": "{{instagramUrl}}",
       "blogUrl": "{{blogUrl}}"
     }
   }
   ```

### 장점:
- 코드 없이 설정
- 무료 플랜으로 시작 가능
- 안정적

---

## 방법 3: Make.com (구 Integromat) 연동 (무료 1000회/월)

### 설정 방법:
1. Make.com 계정 생성 (무료)
2. 새 시나리오 생성:
   - Google Sheets 모듈 추가 (Watch New Rows)
   - HTTP 모듈 추가 (Make a Request)
   - URL과 데이터 매핑

### 장점:
- Zapier보다 무료 한도 높음
- 더 복잡한 자동화 가능

---

## 방법 4: Google Apps Script (개발자용)

```javascript
function onFormSubmit(e) {
  const row = e.range.getRow();
  const sheet = e.range.getSheet();
  const data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const payload = {
    projectId: 'YOUR_PROJECT_ID',
    name: data[0],
    email: data[1],
    phone: data[2],
    threadsUrl: data[3],
    instagramUrl: data[4],
    blogUrl: data[5]
  };
  
  UrlFetchApp.fetch('https://aimax-automation-v2.vercel.app/api/sheets/webhook', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}
```

---

## 현재 가능한 최선의 방법

### 스마트 폴링 (현재 구현됨)
- 활동이 많을 때: 5초 간격
- 활동이 적을 때: 최대 1분 간격
- 서버 부하 최소화
- 추가 설정 불필요

**장점:**
- 즉시 사용 가능
- 추가 비용 없음
- 안정적

**사용법:**
1. Google Sheets URL 입력
2. 자동화 시작 클릭
3. 자동으로 새 응답 감지 및 처리