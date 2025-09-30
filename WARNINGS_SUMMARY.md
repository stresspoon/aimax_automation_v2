# 빌드 및 런타임 경고 요약

최종 업데이트: 2025-09-30

## ✅ 해결 완료

### 1. 패키지 매니저 혼용
- **문제**: package-lock.json과 yarn.lock 공존
- **해결**: package-lock.json 삭제, .gitignore 추가
- **상태**: ✅ 완전 해결

### 2. Next.js swc dependencies
- **문제**: swc 의존성 누락 경고
- **해결**: yarn install로 자동 패치
- **상태**: ✅ 완전 해결

### 3. 보안 헤더
- **문제**: 비권장 보안 헤더 설정 (X-XSS-Protection, X-Frame-Options 등)
- **해결**: next.config.ts에 최신 보안 헤더 추가
  - Strict-Transport-Security
  - X-Content-Type-Options
  - Referrer-Policy
  - Permissions-Policy
- **상태**: ✅ 완전 해결

### 4. CSS 브라우저 호환성
- **문제**: 브라우저 접두사 관련 경고
- **해결**: 
  - autoprefixer 이미 설정됨
  - browserslist 추가로 타겟 브라우저 명시
- **상태**: ✅ 완전 해결

## ℹ️ 무시 가능 (정상 동작)

### 1. Edge Runtime SSG 비활성화
```
⚠ Using edge runtime on a page currently disables static generation
```
- **위치**: `src/app/form/[slug]/opengraph-image.tsx`
- **이유**: OG 이미지를 동적으로 생성하기 위해 Edge Runtime 필요
- **영향**: 없음 (의도된 동작)
- **조치**: 무시 ✅

### 2. Supabase Edge Runtime 경고
```
A Node.js API is used (process.version) which is not supported in the Edge Runtime
```
- **원인**: Supabase SDK 내부 체크 로직
- **영향**: 실제 동작에 문제 없음
- **조치**: 무시 ✅

## 🔒 제어 불가 (외부 서비스)

### 1. 쿠키 expires 포맷
```
Set-Cookie header expires format mismatch
```
- **원인**: Supabase/Cloudflare에서 내려오는 쿠키
- **영향**: 브라우저가 자동으로 처리
- **조치**: 외부 서비스이므로 제어 불가 ✅

### 2. 캐시 헤더 (외부 리소스)
```
Cache-Control: must-revalidate, no-store
```
- **원인**: CDN(jsdelivr 등) 및 외부 API 응답
- **영향**: 없음
- **조치**: 외부 서비스이므로 제어 불가 ✅

## 🎨 성능 최적화 권장사항 (선택사항)

### 1. 애니메이션 성능
- **현재**: width/height/border-color 애니메이션
- **권장**: transform/opacity 사용
- **이유**: GPU 가속 활용
- **우선순위**: 낮음 (현재 성능 문제 없음)

### 2. CSS 속성
- **경고 대상**:
  - `backdrop-filter` (일부 구형 브라우저 미지원)
  - `text-wrap: balance` (Safari 미지원)
  - `user-select` (접두사 필요)
- **조치**: autoprefixer가 자동 처리 중 ✅

## 📊 빌드 결과

```bash
✓ Generating static pages (95/95)
✓ Finalizing page optimization
✓ Collecting build traces

경고: 1개 (기능상 필요)
⚠ Using edge runtime on a page currently disables static generation
```

## 🎯 결론

**실질적인 문제가 되는 경고: 0개**

모든 중요 경고는 해결되었으며, 남은 경고들은:
- 기능상 필요한 것 (Edge Runtime)
- 외부 서비스에서 발생하는 것 (Supabase/Cloudflare)
- 성능에 영향 없는 것 (CSS 호환성)

프로덕션 환경에서 안정적으로 운영 가능합니다. ✅

---

## 참고 자료

- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [Autoprefixer](https://github.com/postcss/autoprefixer)
- [Browserslist](https://github.com/browserslist/browserslist)
