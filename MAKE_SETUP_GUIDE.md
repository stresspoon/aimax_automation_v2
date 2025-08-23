# Make.com 실시간 연동 설정 가이드

## 왜 Make.com을 사용하나요?
- **실시간 처리**: 새 행이 추가되면 즉시 감지
- **중복 방지**: 이미 처리된 데이터는 다시 처리하지 않음
- **무료 한도 충분**: 월 1,000회 실행 무료
- **안정적**: SNS 체크 오류 최소화

## 설정 방법 (5분 소요)

### 1단계: Make.com 계정 생성
1. [Make.com](https://www.make.com) 접속
2. 무료 계정 생성 (신용카드 불필요)

### 2단계: 새 시나리오 생성
1. Dashboard에서 "Create a new scenario" 클릭
2. 빈 시나리오 선택

### 3단계: Google Sheets 모듈 추가
1. "+" 버튼 클릭
2. "Google Sheets" 검색 및 선택
3. "Watch New Rows" 트리거 선택
4. Google 계정 연결
5. 설정:
   - Spreadsheet: 사용 중인 Google Sheet 선택
   - Sheet: 시트 이름 (보통 "Form Responses 1")
   - Limit: 1 (한 번에 하나씩 처리)

### 4단계: HTTP 모듈 추가
1. Google Sheets 모듈 옆 "+" 클릭
2. "HTTP" 검색 및 선택
3. "Make a request" 선택
4. 설정:
   ```
   URL: https://aimax-automation-v2.vercel.app/api/webhook/make
   
   Method: POST
   
   Headers:
   - Name: Content-Type
   - Value: application/json
   - Name: x-project-id
   - Value: [AIMAX에서 복사한 프로젝트 ID]
   
   Body type: JSON
   
   Request content:
   {
     "projectId": "[프로젝트 ID]",
     "rowNumber": "{{1.`__ROW_NUMBER__`}}",
     "name": "{{1.성함}}",
     "email": "{{1.이메일}}",
     "phone": "{{1.연락처}}",
     "threadsUrl": "{{1.`스레드 URL`}}",
     "instagramUrl": "{{1.`인스타그램 URL`}}",
     "blogUrl": "{{1.`블로그 URL`}}"
   }
   ```

### 5단계: 시나리오 저장 및 활성화
1. 시나리오 이름 설정 (예: "AIMAX 자동화")
2. "Save" 클릭
3. 스위치를 켜서 활성화

## AIMAX에서 프로젝트 ID 찾기

1. AIMAX 대시보드에서 프로젝트 선택
2. URL에서 `projectId=` 뒤의 값 복사
   예: `...?projectId=abc123-def456` → `abc123-def456` 복사

## 테스트 방법

1. Google Forms에 테스트 응답 제출
2. Make.com 시나리오가 자동 실행됨
3. AIMAX 대시보드에서 새 후보자 확인
4. SNS 체크 완료 확인

## 장점

✅ **실시간 처리**: 5초 기다릴 필요 없음
✅ **정확한 중복 제거**: 행 번호로 정확하게 구분
✅ **오류 방지**: 이미 처리된 데이터 재처리 안 함
✅ **무료**: 월 1,000회까지 무료

## 문제 해결

### "Project not found" 오류
- 프로젝트 ID가 정확한지 확인
- AIMAX에서 프로젝트가 생성되어 있는지 확인

### SNS 체크 오류
- URL 형식이 올바른지 확인
- https:// 포함 여부 확인

### 중복 데이터
- Make.com에서 "Watch New Rows"를 사용 중인지 확인
- "Get Rows"를 사용하면 전체 데이터를 반복 처리함

## 고급 설정

### 오류 처리 추가
1. HTTP 모듈 우클릭
2. "Add error handler" 선택
3. "Resume" 선택 (오류 무시하고 계속)

### 실행 기록 확인
1. Make.com Dashboard
2. "History" 탭
3. 각 실행 상세 내용 확인 가능

---

## 비교: 현재 방식 vs Make.com

| 항목 | 현재 (스마트 폴링) | Make.com |
|------|------------------|----------|
| 응답 시간 | 5초~1분 | 즉시 |
| 중복 처리 | 가끔 발생 | 없음 |
| SNS 체크 | 가끔 오류 | 안정적 |
| 설정 난이도 | 없음 | 5분 |
| 비용 | 무료 | 무료 (월 1,000회) |

---

💡 **추천**: Google Forms + Make.com 조합이 가장 안정적이고 빠릅니다!