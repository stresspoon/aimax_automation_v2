# 🚀 AIMAX v2 배포 체크리스트

이 문서는 반복적으로 발생하는 배포 오류를 예방하기 위한 체크리스트입니다.
배포 전 반드시 아래 항목들을 확인하세요.

## 📋 배포 전 필수 확인 사항

### 1. TypeScript 타입 체크 ✅
```bash
npm run type-check
```

### 2. 빌드 테스트 ✅
```bash
npm run build
```

### 3. Git 상태 확인 ✅
```bash
git status
```
모든 변경사항이 커밋되었는지 확인

---

## 🔴 자주 발생하는 배포 오류 패턴

### 1. **TypeScript 타입 오류**

#### 1.1 상태 초기화 타입 불일치
**발생 빈도**: ⭐⭐⭐⭐⭐ (매우 높음)

**오류 예시**:
```typescript
Type error: Property 'candidates' does not exist on type '{ formId: string | null; formUrl: string | null; }'
```

**체크 포인트**:
- [ ] useState 초기값과 실제 사용하는 속성이 일치하는가?
- [ ] 모든 필수 속성이 초기 상태에 정의되어 있는가?
- [ ] 상태 리셋 시 모든 속성을 포함하고 있는가?

**예방 방법**:
```typescript
// ❌ 잘못된 예
const [projectData, setProjectData] = useState({
  step2: {
    formId: null,
    formUrl: null,
    // candidates가 빠짐!
  }
})

// ✅ 올바른 예
const [projectData, setProjectData] = useState({
  step2: {
    formId: null,
    formUrl: null,
    candidates: [],  // 모든 속성 포함
    sheetUrl: "",
    isRunning: false,
    // ... 기타 필수 속성
  }
})
```

#### 1.2 null/undefined 처리
**발생 빈도**: ⭐⭐⭐⭐ (높음)

**오류 예시**:
```typescript
Type error: Argument of type 'string | null' is not assignable to parameter of type 'string | URL | undefined'
```

**체크 포인트**:
- [ ] window.open(), fetch() 등에 null 값 처리가 되어 있는가?
- [ ] 옵셔널 체이닝(?.)과 널 병합 연산자(??)를 적절히 사용했는가?

**예방 방법**:
```typescript
// ❌ 잘못된 예
window.open(projectData.step2.formUrl, '_blank')

// ✅ 올바른 예
window.open(projectData.step2.formUrl || '', '_blank')
```

### 2. **React Hooks 오류**

#### 2.1 useEffect 반환값
**발생 빈도**: ⭐⭐⭐ (보통)

**오류 예시**:
```typescript
Type error: Not all code paths return a value
```

**체크 포인트**:
- [ ] 모든 useEffect가 cleanup 함수 또는 undefined를 반환하는가?
- [ ] 조건부 return이 있는 경우 모든 경로에서 반환값이 있는가?

**예방 방법**:
```typescript
// ❌ 잘못된 예
useEffect(() => {
  if (condition) {
    const interval = setInterval(...)
    return () => clearInterval(interval)
  }
  // 반환값 없음!
}, [])

// ✅ 올바른 예
useEffect(() => {
  if (condition) {
    const interval = setInterval(...)
    return () => clearInterval(interval)
  }
  return undefined  // 명시적 반환
}, [])
```

### 3. **Next.js 15 특정 오류**

#### 3.1 useSearchParams Suspense 경계
**발생 빈도**: ⭐⭐⭐⭐ (높음)

**오류 예시**:
```
useSearchParams() should be wrapped in a suspense boundary at page "/path"
```

**체크 포인트**:
- [ ] useSearchParams를 사용하는 컴포넌트가 Suspense로 래핑되어 있는가?

**예방 방법**:
```typescript
// ❌ 잘못된 예
export default function Page() {
  const searchParams = useSearchParams()
  return <div>...</div>
}

// ✅ 올바른 예
function PageContent() {
  const searchParams = useSearchParams()
  return <div>...</div>
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent />
    </Suspense>
  )
}
```

#### 3.2 Dynamic Routes params 처리
**발생 빈도**: ⭐⭐ (낮음)

**체크 포인트**:
- [ ] Next.js 15에서 params는 Promise로 처리되는가?
- [ ] async/await를 사용하여 params를 처리했는가?

### 4. **환경 변수 오류**

**발생 빈도**: ⭐⭐⭐ (보통)

**체크 포인트**:
- [ ] 모든 필수 환경 변수가 .env.local/Vercel에 정의되어 있는가?
- [ ] NEXT_PUBLIC_ 접두사가 필요한 변수에 적용되어 있는가?

필수/권장 변수 목록:
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Base URL: `NEXT_PUBLIC_BASE_URL` (예: `https://your-domain.com`)
- Forms/Sheets(선택):
  - 게이트: `ENABLE_SHEETS_INTEGRATION` = `true|false`
  - Forms Webhook 서명: `FORMS_WEBHOOK_SECRET` (운영 필수)
- Payments(토스):
  - `TOSS_WEBHOOK_SECRET` (운영 필수)
  - `NEXT_PUBLIC_TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY` (결제 생성/승인 시)
- Google OAuth/Gmail: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### 5. **모듈 임포트 오류**

**발생 빈도**: ⭐⭐ (낮음)

**오류 예시**:
```
Cannot find module '@/lib/...' or its corresponding type declarations
```

**체크 포인트**:
- [ ] tsconfig.json의 paths 설정이 올바른가?
- [ ] 임포트 경로가 실제 파일 경로와 일치하는가?
- [ ] 대소문자가 정확한가? (case-sensitive)

---

## 🛠️ 로컬과 배포 환경 차이점

### 주요 차이점:
1. **코드 소스**
   - 로컬: 작업 디렉토리의 파일
   - 배포: GitHub 저장소의 커밋된 파일

2. **TypeScript 설정**
   - 로컬: 캐시된 타입 정보 사용 가능
   - 배포: 매번 새로 타입 체크

3. **환경 변수**
   - 로컬: .env.local
   - 배포: Vercel 환경 변수 설정

---

## ✅ 최종 배포 체크리스트

### 배포 전:
- [ ] `npm run type-check` 성공
- [ ] `npm run build` 성공
- [ ] 모든 변경사항 커밋 (`git status` 확인)
- [ ] 환경 변수 확인

### 커밋 메시지:
- [ ] 변경 내용이 명확하게 기술되어 있는가?
- [ ] fix/feat/chore 등 컨벤션을 따랐는가?

### 푸시 후:
- [ ] Vercel 대시보드에서 빌드 상태 확인
- [ ] 배포된 사이트에서 기능 테스트

---

## 📝 트러블슈팅 순서

배포 오류 발생 시:

1. **오류 메시지 확인**
   - Vercel 빌드 로그 확인
   - 오류 타입 파악 (TypeScript, Runtime, Build)

2. **로컬 재현**
   ```bash
   npm run build
   ```

3. **타입 체크**
   ```bash
   npm run type-check
   ```

4. **캐시 클리어** (필요시)
   ```bash
   npm run clean
   npm install
   npm run build
   ```

5. **변경사항 커밋 & 푸시**
   ```bash
   git add .
   git commit -m "fix: [오류 내용]"
   git push origin main
   ```

---

## 🔄 업데이트 기록

- 2024-08-25: 초기 문서 작성
  - TypeScript 타입 오류 패턴 정리
  - React Hooks 오류 패턴 정리
  - Next.js 15 특정 오류 패턴 정리

---

## 💡 팁

1. **예방이 최선**: 코드 작성 시 타입을 명확히 정의
2. **즉시 커밋**: 로컬에서 작동 확인 후 바로 커밋
3. **작은 단위로 배포**: 큰 변경보다 작은 단위로 자주 배포
4. **타입 우선**: any 타입 사용 최소화, strict mode 준수

---

이 문서는 새로운 오류 패턴이 발견될 때마다 업데이트됩니다.
