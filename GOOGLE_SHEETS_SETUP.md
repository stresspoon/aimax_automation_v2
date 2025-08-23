# Google Sheets 자동 동기화 설정 가이드

## OAuth 인증 방식 (권장)

### 1. Google Sheets 준비
1. 새 Google Sheets 생성
2. 첫 번째 행에 헤더 추가:
   - A1: 날짜
   - B1: 이름
   - C1: 연락처
   - D1: 이메일
   - E1: 신청 경로
   - F1: Threads URL
   - G1: Threads 팔로워
   - H1: Instagram URL
   - I1: Instagram 팔로워
   - J1: Blog URL
   - K1: Blog 이웃수
   - L1: 선정여부
   - M1: 선정사유

### 2. AIMAX에서 Google Sheets 연결
1. 자동화 페이지에서 "Google Sheets 연결하기" 버튼 클릭
2. Google 계정으로 로그인 및 권한 승인
3. 연결 완료 후 Google Sheets URL 입력
4. "업데이트" 버튼 클릭

### 3. 작동 원리
- 폼 제출 → SNS 체크 → Google Sheets 자동 추가
- OAuth 인증으로 안전하게 데이터 동기화
- Supabase 데이터베이스에서 자동으로 아카이브 (무료 한도 유지)

### 주의사항
- Google Sheets 공유 설정 불필요 (OAuth로 인증)
- 한 번 인증하면 계속 사용 가능
- 데이터는 자동으로 동기화됨