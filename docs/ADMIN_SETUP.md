# 관리자 페이지 설정 가이드

## 관리자 계정 정보

### 기본 관리자 계정
- **이메일**: `admin@aimax.kr`
- **초기 비밀번호**: `Aimax2024Admin!`
- **⚠️ 중요**: 첫 로그인 후 반드시 비밀번호를 변경하세요!

## 설정 방법

### 1. 데이터베이스 마이그레이션 실행

먼저 Supabase에서 관리자 역할 테이블을 생성합니다:

```bash
# Supabase CLI가 설치되어 있는 경우
supabase migration up

# 또는 Supabase 대시보드에서 직접 실행
# SQL Editor에서 /supabase/migrations/20240821_create_admin_roles.sql 내용 실행
```

### 2. 관리자 계정 생성

#### 방법 A: 스크립트 사용 (권장)
```bash
npm run create-admin
```

#### 방법 B: Supabase 대시보드에서 수동 생성
1. [Supabase 대시보드](https://app.supabase.com) 접속
2. Authentication → Users 메뉴 이동
3. "Add User" 버튼 클릭
4. 다음 정보 입력:
   - Email: `admin@aimax.kr`
   - Password: `Aimax2024Admin!`
   - Auto Confirm User: ✅ 체크
5. Create User 클릭

### 3. 로그인 및 접속

1. 개발 서버 실행:
```bash
npm run dev
```

2. 관리자 페이지 접속:
- URL: http://localhost:3001/admin
- 이메일: `admin@aimax.kr`
- 비밀번호: `Aimax2024Admin!`

## 관리자 권한 시스템

### 역할 구분
- **user**: 일반 사용자
- **admin**: 관리자
- **super_admin**: 최고 관리자

### 자동 권한 부여
- `@aimax.kr` 도메인 이메일로 가입 시 자동으로 admin 권한 부여
- 스크립트로 생성된 계정은 super_admin 권한 부여

## 문제 해결

### "관리자 권한이 필요합니다" 오류
1. 로그인한 계정이 `@aimax.kr` 도메인인지 확인
2. user_profiles 테이블에서 role이 'admin' 또는 'super_admin'인지 확인

### 관리자 계정이 생성되지 않는 경우
1. `.env.local` 파일에 다음 환경 변수가 설정되어 있는지 확인:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Supabase 프로젝트가 활성화되어 있는지 확인

## 보안 권고사항

1. **프로덕션 환경에서는**:
   - 초기 비밀번호를 즉시 변경
   - 2단계 인증 활성화
   - IP 화이트리스트 설정 고려

2. **Service Role Key 관리**:
   - `.env.local` 파일을 절대 커밋하지 않음
   - 프로덕션에서는 환경 변수로 관리

3. **정기적인 보안 점검**:
   - 관리자 계정 목록 주기적 검토
   - 비활성 관리자 계정 비활성화
   - 접근 로그 모니터링