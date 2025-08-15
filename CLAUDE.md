# AIMAX v2 프로젝트 가이드

## 프로젝트 개요
AIMAX v2는 AI 기반 마케팅 자동화 SaaS 플랫폼입니다.

## 기술 스택
- **Framework**: Next.js 15.4.6 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **Animation**: Framer Motion

## 프로젝트 구조
```
v2/
├── src/
│   ├── app/              # Next.js App Router 페이지
│   ├── components/       # React 컴포넌트
│   │   ├── ui/          # shadcn/ui 컴포넌트
│   │   └── landing/     # 랜딩 페이지 컴포넌트
│   ├── lib/             # 유틸리티 함수
│   │   └── supabase/    # Supabase 클라이언트
│   ├── hooks/           # Custom React Hooks
│   └── store/           # Zustand 스토어
├── supabase/
│   └── migrations/      # 데이터베이스 마이그레이션
└── public/              # 정적 파일
```

## 개발 명령어
```bash
npm run dev         # 개발 서버 실행 (포트 3001)
npm run build       # 프로덕션 빌드
npm run type-check  # TypeScript 타입 체크
npm run lint        # ESLint 실행
npm run format      # Prettier 포맷팅
npm run clean       # 캐시 및 node_modules 삭제
npm run reinstall   # 클린 재설치
```

## 주요 기능
1. **사용자 인증**: Supabase Auth 사용
2. **캠페인 관리**: 마케팅 캠페인 CRUD
3. **자동화 도구**: 
   - 고객 모집 자동화
   - 상세페이지 생성
   - 영상 제작 자동화
4. **결제 시스템**: 토스페이먼츠 통합 (구현 예정)

## 환경 변수 (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_BASE_URL=http://localhost:3001
```

## 배포
- **Platform**: Vercel
- **Root Directory**: v2 (Vercel 설정에서 지정)
- **Build Command**: npm run build
- **Output Directory**: .next

## 주의사항

### 1. 패키지 관리자
- npm만 사용 (yarn 사용 금지)
- 상위 폴더에 yarn.lock이 있지만 v2는 독립적으로 운영

### 2. TypeScript Strict Mode
- 모든 새 코드는 strict mode 준수
- any 타입 사용 최소화
- null/undefined 체크 필수

### 3. Supabase RLS
- 모든 테이블에 Row Level Security 활성화
- 사용자는 자신의 데이터만 접근 가능

### 4. UI 컴포넌트
- 새 UI 컴포넌트는 `npx shadcn@latest add [component]` 사용
- 커스텀 컴포넌트는 /src/components에 생성

### 5. Next.js 15 주의사항
- Dynamic Routes: params는 Promise로 처리
- useSearchParams는 Suspense 경계 필요
- 서버 컴포넌트 우선 사용

## 트러블슈팅

### 빌드 오류 시
1. `npm run clean` 실행
2. `npm install` 재실행
3. `npm run type-check`로 타입 오류 확인

### Supabase 연결 오류
1. 환경 변수 확인
2. Supabase 대시보드에서 프로젝트 상태 확인
3. RLS 정책 확인

### UI 컴포넌트 누락
```bash
npx shadcn@latest add [component-name]
```

## 팀 규칙
1. 커밋 전 `npm run lint` 실행
2. TypeScript 타입 명시적 작성
3. 컴포넌트는 함수형으로 작성
4. 상태 관리는 가능한 서버 컴포넌트 활용
5. 클라이언트 컴포넌트는 필요한 경우만 "use client" 사용

## 연락처
- 이슈 발생 시 GitHub Issues에 등록
- 긴급 문의: [팀 슬랙 채널]