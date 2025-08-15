# AIMAX v2 배포 오류 및 해결 방법 정리

## 📅 2025-08-15 배포 과정에서 발생한 오류들

### 1. 🔴 lucide-react 모듈을 찾을 수 없음

**오류 메시지:**
```
Module not found: Can't resolve 'lucide-react'
./src/components/chatbot-popup.tsx (4:1)
```

**원인:**
- 챗봇 팝업 컴포넌트에서 lucide-react 아이콘을 사용했지만 패키지가 설치되지 않음

**해결 방법:**
```bash
npm install lucide-react
```

---

### 2. 🔴 shadcn/ui 컴포넌트 모듈을 찾을 수 없음

**오류 메시지:**
```
Module not found: Can't resolve '@/components/ui/button'
Module not found: Can't resolve '@/components/ui/sheet'
```

**원인:**
- 랜딩 페이지 컴포넌트들이 shadcn/ui 컴포넌트를 사용하는데 설치되지 않음

**해결 방법:**
1. 필요한 UI 컴포넌트 직접 생성
```bash
# button.tsx, sheet.tsx 파일 직접 생성
```

2. 필요한 의존성 설치
```bash
npm install @radix-ui/react-slot @radix-ui/react-dialog class-variance-authority
```

---

### 3. 🔴 pointer-landing-template 폴더 빌드 오류

**오류 메시지:**
```
Type error: Cannot find module 'geist/font/sans' or its corresponding type declarations.
./v2/pointer-landing-template/app/layout.tsx:2:27
```

**원인:**
- 템플릿 폴더가 빌드에 포함되어 불필요한 의존성 오류 발생

**해결 방법:**
1. tsconfig.json에서 템플릿 폴더 제외
```json
{
  "exclude": ["node_modules", "pointer-landing-template"]
}
```

2. .gitignore에 템플릿 폴더 추가
```
# template folders
pointer-landing-template/
```

3. Git에서 템플릿 폴더 제거
```bash
git rm -r --cached pointer-landing-template
```

---

### 4. 🔴 @/lib/db 모듈을 찾을 수 없음

**오류 메시지:**
```
Type error: Cannot find module '@/lib/db' or its corresponding type declarations.
./v2/src/app/api/auth/forgot-password/route.ts:2:51
```

**원인:**
- 인증 API들이 이전 방식의 로컬 DB 함수를 사용하고 있었음
- Supabase로 마이그레이션이 완료되지 않음

**해결 방법:**
모든 인증 API를 Supabase 클라이언트를 사용하도록 수정:

1. **forgot-password/route.ts**
```typescript
import { createClient } from '@/lib/supabase/server';
// supabase.auth.resetPasswordForEmail() 사용
```

2. **reset-password/route.ts**
```typescript
// supabase.auth.exchangeCodeForSession() 사용
// supabase.auth.updateUser() 사용
```

3. **login/route.ts**
```typescript
// supabase.auth.signInWithPassword() 사용
```

4. **signup/route.ts**
```typescript
// supabase.auth.signUp() 사용
// profiles 테이블에 추가 정보 저장
```

5. **me/route.ts**
```typescript
// supabase.auth.getUser() 사용
```

6. **logout/route.ts**
```typescript
// supabase.auth.signOut() 사용
```

---

### 5. 🔴 @/lib/supabase/server 모듈을 찾을 수 없음

**오류 메시지:**
```
Type error: Cannot find module '@/lib/supabase/server' or its corresponding type declarations.
./v2/src/app/api/auth/forgot-password/route.ts:2:30
```

**원인:**
- Vercel이 프로젝트 루트를 잘못 인식
- v2 폴더가 서브폴더인데 메인 프로젝트처럼 빌드하려고 함

**첫 번째 시도 (실패):**
vercel.json 파일 생성
```json
{
  "buildCommand": "cd v2 && npm run build",
  "outputDirectory": "v2/.next",
  "installCommand": "cd v2 && npm install",
  "framework": "nextjs",
  "root": "v2"
}
```
→ 이 방법은 작동하지 않음

**최종 해결 방법:**
1. vercel.json 파일 제거
2. Vercel 대시보드에서 직접 설정:
   - Settings → General
   - Root Directory: `v2`
   - Framework Preset: Next.js
   - Save & Redeploy

---

## 📋 배포 체크리스트

### 로컬 개발 환경
- [x] Node.js 18+ 설치
- [x] npm/yarn 최신 버전
- [x] 모든 의존성 설치 (`npm install`)
- [x] 환경 변수 설정 (.env.local)

### 필수 패키지
- [x] lucide-react (아이콘)
- [x] @radix-ui/* (UI 컴포넌트 기반)
- [x] class-variance-authority (스타일 변형)
- [x] @supabase/supabase-js (데이터베이스)
- [x] @supabase/ssr (서버 사이드 렌더링)

### Supabase 설정
- [x] Supabase 프로젝트 생성
- [x] 환경 변수 설정
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
- [x] 데이터베이스 스키마 마이그레이션
- [x] RLS (Row Level Security) 정책 설정

### Vercel 배포 설정
- [x] GitHub 연동
- [x] Root Directory: `v2` (중요!)
- [x] 환경 변수 설정
- [x] 자동 배포 설정

---

## 🚀 권장 프로젝트 구조

```
aimax-automation/
├── v2/                    # 메인 프로젝트
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.local
├── v1/                    # 이전 버전 (참고용)
└── docs/                  # 문서
```

### 프로젝트 구조 개선 제안
1. **현재 구조 유지** (추천)
   - v1과 v2 모두 보존
   - Vercel에서 v2만 배포
   - 점진적 마이그레이션 가능

2. **v2 독립 레포지토리**
   - 깔끔한 구조
   - 독립적인 배포
   - Git 히스토리 새로 시작

---

## 💡 트러블슈팅 팁

### 빌드 오류 발생 시
1. 로컬에서 먼저 빌드 테스트
   ```bash
   npm run build
   ```

2. TypeScript 타입 체크
   ```bash
   npx tsc --noEmit
   ```

3. ESLint 검사
   ```bash
   npm run lint
   ```

### Vercel 배포 실패 시
1. Vercel 로그 확인
2. Root Directory 설정 확인
3. 환경 변수 확인
4. package.json의 scripts 확인

### Supabase 연결 오류 시
1. 환경 변수 확인
2. Supabase 프로젝트 상태 확인
3. RLS 정책 확인
4. 네트워크 설정 확인

---

## 📝 배운 점

1. **명확한 프로젝트 구조의 중요성**
   - 모노레포 vs 멀티레포 결정
   - Root Directory 설정의 중요성

2. **의존성 관리**
   - 사용하는 모든 패키지는 명시적으로 설치
   - 템플릿 코드는 별도 관리

3. **환경 변수 관리**
   - 로컬과 프로덕션 환경 분리
   - 민감한 정보는 절대 커밋하지 않음

4. **점진적 마이그레이션**
   - 한 번에 모든 것을 바꾸지 않기
   - 기능별로 단계적 이전

5. **Vercel 배포 설정**
   - 대시보드 설정이 vercel.json보다 우선
   - Root Directory 설정이 핵심

---

*최종 업데이트: 2025-08-15*