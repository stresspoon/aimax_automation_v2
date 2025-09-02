# 토스페이먼츠 결제 기능 설정 가이드

## 1. 데이터베이스 테이블 생성

Supabase 대시보드에서 다음 단계를 따라 테이블을 생성해주세요:

### 방법 1: Supabase 대시보드에서 직접 실행
1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 "SQL Editor" 클릭
4. `supabase/migrations/20250901_create_payments_tables.sql` 파일의 내용 복사
5. SQL Editor에 붙여넣기
6. "Run" 버튼 클릭

### 방법 2: 터미널에서 실행
```bash
# Supabase CLI 로그인
npx supabase login

# 프로젝트 연결
npx supabase link --project-ref zlowtgtcjdkzdlsclxnq

# 마이그레이션 실행
npx supabase db push
```

## 2. 테스트 방법

1. 결제 테스트 페이지 접속: http://localhost:3001/payment/test
2. 테스트 카드 정보 입력:
   - 카드번호: 4242-4242-4242-4242
   - 유효기간: 12/28
   - CVC: 123
   - 비밀번호: 00

## 3. 토스페이먼츠 대시보드 설정 (프로덕션)

### 웹훅 URL 등록
1. [토스페이먼츠 대시보드](https://developers.tosspayments.com) 접속
2. 웹훅 설정으로 이동
3. 웹훅 URL 등록: `https://your-domain.com/api/payments/webhook`

### 프로덕션 키 교체
`.env.local` 파일에서 테스트 키를 프로덕션 키로 교체:
```env
NEXT_PUBLIC_TOSS_CLIENT_KEY=live_ck_YOUR_CLIENT_KEY
TOSS_SECRET_KEY=live_sk_YOUR_SECRET_KEY
```

## 4. 구현된 기능

- ✅ 결제 생성 및 승인
- ✅ 결제 위젯 UI
- ✅ 결제 성공/실패 페이지
- ✅ 결제 내역 조회
- ✅ 웹훅 처리
- ✅ 구독 관리
- ✅ 환불 처리

## 5. API 엔드포인트

- `POST /api/payments/create` - 결제 생성
- `GET /api/payments/create` - 결제 내역 조회
- `POST /api/payments/confirm` - 결제 승인
- `POST /api/payments/webhook` - 웹훅 처리

## 6. 트러블슈팅

### "payments 테이블을 찾을 수 없음" 오류
→ 위의 "1. 데이터베이스 테이블 생성" 단계를 수행하세요

### 결제 위젯이 표시되지 않음
→ 환경 변수에 토스페이먼츠 클라이언트 키가 설정되었는지 확인하세요

### 결제 승인 실패
→ 토스페이먼츠 시크릿 키가 올바른지 확인하세요