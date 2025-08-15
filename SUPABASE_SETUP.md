# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 접속하여 계정 생성/로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `aimax-v2`
   - Database Password: 강력한 비밀번호 설정
   - Region: `Northeast Asia (Seoul)` 선택

## 2. 환경변수 설정

프로젝트 생성 후 Settings > API 에서 다음 정보를 복사:

1. `.env.local` 파일 생성 (`.env.local.example` 참고)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## 3. 데이터베이스 스키마 적용

### 방법 1: Supabase Dashboard에서 직접 실행
1. SQL Editor 탭으로 이동
2. **먼저 현재 테이블 확인**:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```
3. 다음 파일들을 순서대로 실행:
   - `supabase/migrations/001_initial_schema.sql` - 테이블 생성 (아직 테이블이 없는 경우)
   - `supabase/migrations/002_enable_rls_simple.sql` - RLS 활성화 (Security Advisor 경고 해결)
4. 각 파일 내용을 복사하여 SQL Editor에 붙여넣기 후 실행

### 방법 2: Supabase CLI 사용 (선택사항)
```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref [your-project-ref]

# 마이그레이션 실행
supabase db push
```

## 4. Authentication 설정

1. Authentication > Providers 에서 이메일 인증 활성화 확인
2. Authentication > Email Templates 에서 템플릿 커스터마이징 (선택사항)
3. Authentication > URL Configuration 에서 리다이렉트 URL 설정:
   - Site URL: `http://localhost:3001` (개발)
   - Redirect URLs: `http://localhost:3001/auth/callback`

## 5. Storage 설정 (추후 필요시)

1. Storage 탭에서 버킷 생성:
   - `avatars` - 사용자 프로필 이미지
   - `campaign-assets` - 캠페인 관련 파일
   - `generated-content` - AI 생성 콘텐츠

## 6. 테스트

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 확인
http://localhost:3001
```

## 주요 테이블 구조

### profiles
- 사용자 프로필 정보
- Supabase Auth와 연동

### campaigns
- 마케팅 캠페인 정보
- 상태 관리 (draft, active, paused, completed)

### projects
- 자동화 프로젝트 (고객모집, 상세페이지, 영상)
- 캠페인과 연결

### orders
- 주문 정보
- 결제 상태 관리

### tool_purchases
- 개별 도구 구매 기록

## Row Level Security (RLS)

모든 테이블에 RLS가 적용되어 있어 사용자는 자신의 데이터만 접근 가능합니다.

**중요**: `002_enable_rls.sql` 마이그레이션을 실행하여 RLS를 활성화해야 합니다.
- RLS가 활성화되지 않으면 Supabase Security Advisor에서 경고가 표시됩니다
- 모든 public 스키마 테이블은 RLS가 활성화되어야 안전합니다

## Performance Advisor 경고 해결

### review 테이블 관련 경고
만약 Performance Advisor에서 `review_packs`, `review_invites` 등의 테이블 관련 경고가 나타난다면:

1. 이 테이블들이 현재 프로젝트에서 사용되지 않는 경우:
   - `supabase/optimize_rls_policies.sql` 실행하여 RLS 비활성화
   
2. 완전히 삭제하려면:
   ```sql
   DROP TABLE IF EXISTS public.review_packs CASCADE;
   DROP TABLE IF EXISTS public.review_invites CASCADE;
   DROP TABLE IF EXISTS public.review_drafts CASCADE;
   DROP TABLE IF EXISTS public.review_submissions CASCADE;
   ```

## 트러블슈팅

### CORS 에러
- Supabase Dashboard > Settings > API > CORS에서 도메인 추가

### 인증 에러
- 환경변수가 올바르게 설정되었는지 확인
- `.env.local` 파일이 `.gitignore`에 포함되어 있는지 확인

### 마이그레이션 에러
- SQL Editor에서 에러 메시지 확인
- 기존 테이블과 충돌 시 DROP TABLE 후 재실행