## Gmail OAuth 프로덕션 공개(검증 제출) 체크리스트

### 목적
- 사용자 Gmail 계정으로 실제 발신(From=사용자 주소)을 위해 `gmail.send` 제한 스코프 사용 승인 절차 정리

### 최소 스코프 구성
- 필수만 요청(심사 범위 축소)
  - `openid`
  - `email`
  - `profile`
  - `https://www.googleapis.com/auth/gmail.send`
- 제거 권장: 불필요한 `drive.*` 등 기타 스코프

### 사전 준비
- Google Cloud Console
  - APIs & Services → Library → “Gmail API” Enable
  - OAuth consent screen: External(또는 Workspace 내부는 Internal)
  - App domain 등록: 홈페이지, Privacy Policy, Terms of Service URL
  - Domain verification(도메인 소유 인증) 진행
  - Credentials → OAuth 2.0 Client ID(Web) 생성/수정
    - Authorized redirect URIs에 Supabase 콜백 URL 추가: `https://<project-ref>.supabase.co/auth/v1/callback`
- Vercel 환경변수(서버 전용)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - 이미 설정한 값 유지: `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### 제출 항목(구글 검증 시 요구)
1) Scope justification(예시 문안)
   - 목적: “사용자가 앱 내에서 직접 작성·트리거한 메일을 본인 Gmail 주소로 발신하기 위해 `gmail.send` 권한이 필요합니다.”
   - 범위: “메일 전송 기능만 사용하며, 수신/읽기/검색/라벨 관리 등은 사용하지 않습니다. 내용·메타데이터를 수집·보관하지 않습니다.”
   - 보안: “OAuth 토큰만 암호화(At-Rest) 저장하며, 최소 권한/최소 보존 원칙을 따릅니다. 사용자는 Google 계정 보안에서 언제든 권한을 철회할 수 있습니다.”
   - 사용자 흐름: “로그인 → 동의 화면 → 앱에서 메일 전송 → 마이페이지에서 연결 해제 가능.”

2) Demo video(비공개 YouTube 링크 권장)
   - 2~3분 시나리오
     - 앱 접속 → Google OAuth 동의(요청 스코프 화면 표시)
     - 앱 UI에서 메일 전송 트리거 → Gmail “보낸편지함”에 발신 내역 확인(From=사용자 주소)
     - 마이페이지에서 연결 해제(또는 Google 계정 보안 화면에서 `제3자 액세스` 권한 철회)

3) 개인정보/보안 고지(Privacy/ToS 페이지에 포함)
   - 수집 항목: “OAuth 토큰(액세스·리프레시)”만 저장, 메일 본문/수신내역 미저장
   - 용도: “사용자가 요청한 발송 작업 수행” 외 다른 용도로 사용 없음
   - 보관/삭제: “사용자 요청/계정 삭제/장기 미사용 시 즉시 폐기”
   - 암호화: 저장 시 KMS 또는 DB 암호화 적용

### UI/플로우 요구사항(심사 시 확인 포인트)
- 최초 연결 시 `offline access + prompt=consent`로 리프레시 토큰 수령
- 연결 상태 표시, 연결 해제(권한 철회) 진입 경로 제공
- 오류 메시지 명확화: 토큰 만료/일일 한도 초과/권한 철회 시 재연결 가이드

### 제출 경로
- Google Cloud Console → APIs & Services → OAuth consent screen → `Publish App` 또는 `Submit for verification`

### 테스트/운영 모드
- 테스트 모드: Test users(최대 100명) 추가 시 심사 없이 사용 가능
- 프로덕션 공개: 위 제출 항목 충족 후 승인 필요(검토 기간 상이)

### 배포 후 점검
- 발송 로그/지표 모니터링(성공/실패, 에러 유형)
- 비정상 트래픽/악용 방지(rate limit, reCAPTCHA 등)
- 비밀키 교체 전략 수립(클라이언트 시크릿 로테이션)

### 체크리스트(요약)
- [ ] Gmail API Enable
- [ ] 최소 스코프만 요청(`openid`, `email`, `profile`, `gmail.send`)
- [ ] App domain/Privacy/Terms 페이지 구비 + 도메인 인증
- [ ] Redirect URI 등록(Supabase callback)
- [ ] Demo video(시나리오 포함) 준비
- [ ] Scope justification 문안 준비
- [ ] Vercel 환경변수 설정(Client ID/Secret 등)
- [ ] 테스트 모드 동작 확인 → 검증 제출 → 승인 후 프로덕션 공개


