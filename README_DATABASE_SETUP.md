# 🔧 데이터베이스 설정 가이드

## 로컬 개발 환경 설정

### 방법 1: Supabase Dashboard에서 직접 실행 (권장)
1. [Supabase Dashboard](https://supabase.com/dashboard) 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. `scripts/create-forms-tables.sql` 파일 내용 복사
5. SQL Editor에 붙여넣고 **Run** 클릭

### 방법 2: 자동 스크립트 실행
```bash
node scripts/setup-database.js
```

## 환경별 Supabase 사용

### 🟢 현재 설정 (권장)
- **로컬 개발**: 원격 Supabase 사용
- **Vercel 배포**: 동일한 원격 Supabase 사용
- **장점**: 설정 변경 없이 일관된 데이터 사용

### 🔄 환경별 분리 (선택사항)
로컬과 프로덕션 DB를 분리하려면:

1. **개발용 Supabase 프로젝트 생성**
2. `.env.local`에 개발 DB 정보 설정
3. `.env.production`에 운영 DB 정보 설정

```env
# .env.local (개발용)
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key

# .env.production (운영용)
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
```

## 테이블 확인
Supabase Dashboard > Table Editor에서 다음 테이블 확인:
- ✅ `forms` - 폼 정보
- ✅ `form_responses_temp` - 임시 응답
- ✅ `processing_queue` - 처리 대기열

## 문제 해결

### "테이블을 찾을 수 없습니다" 오류
→ SQL Editor에서 `scripts/create-forms-tables.sql` 실행

### "권한이 없습니다" 오류
→ RLS 정책 확인, anon/authenticated 권한 확인

### 로컬/배포 데이터 불일치
→ 동일한 Supabase 프로젝트 사용 중인지 확인