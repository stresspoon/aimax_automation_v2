# SNS 재체크 문제 해결 가이드

## 문제 원인

SNS 재체크 버튼을 눌렀을 때 전부 0으로 표시되는 이유:

1. **SNS scrape API가 Puppeteer(Chrome)을 사용하여 동적 콘텐츠를 가져옴**
2. **API 체인**: 재체크 → `/api/sheets/measure` → `parseMetrics()` → `/api/sns/scrape` (Puppeteer)
3. **환경변수 설정**: `NEXT_PUBLIC_BASE_URL=http://localhost:3001`
4. **개발 서버가 실행 중이 아니면 API 호출 실패 → 0 반환**

## 해결 방법

### 방법 1: 개발 서버 실행 (권장)

```bash
# 터미널에서 개발 서버 실행
yarn dev
# 또는
npm run dev
```

- 개발 서버가 http://localhost:3001에서 실행되어야 SNS API가 정상 작동합니다.
- 서버 실행 후 재체크 버튼을 다시 눌러보세요.

### 방법 2: 프로덕션 URL 사용

`.env.local` 파일 수정:

```bash
# 로컬 개발용 (개발 서버 실행 필요)
NEXT_PUBLIC_BASE_URL=http://localhost:3001

# 프로덕션 배포용 (Vercel 등)
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
```

- 프로덕션 URL로 변경하면 배포된 서버의 SNS API를 사용합니다.
- 단, Vercel에서는 Puppeteer가 @sparticuz/chromium을 사용하여 실행됩니다.

## 디버깅 방법

### 1. 콘솔 로그 확인

브라우저 개발자 도구 콘솔에서 다음 메시지 확인:

```
[SNS 재체크] Threads URL: ...
[SNS 재체크] Threads 결과: ...
[measure] Threads parseMetrics 결과: ...
```

- `결과: 0` → SNS API 호출 실패
- `오류: Failed to fetch` → 서버가 실행 중이 아님
- `오류: timeout` → API 타임아웃 (30초)

### 2. 서버 로그 확인

터미널에서 개발 서버 로그 확인:

```
[SNS Scrape API] 요청 받음
Using browser instance 1
[Instagram] 팔로워 추출 시작
[Instagram] 동적 추출 성공: 123K
✅ Instagram 팔로워 수: 123000
```

## 기술적 제약사항

### Instagram & Threads
- 동적 콘텐츠 (JavaScript 렌더링 필요)
- **Puppeteer 필수**: 정적 HTML 추출로는 팔로워 수를 가져올 수 없음
- Chrome 브라우저 필요 (로컬) 또는 @sparticuz/chromium (Vercel)

### 네이버 블로그
- iframe 구조
- Puppeteer로 iframe 내부 데이터 추출
- 일부 경우 정적 추출 가능하지만 제한적

## 향후 개선 사항

1. **에러 메시지 개선**: 0 대신 "API 연결 실패" 등 명확한 메시지 표시
2. **서버 상태 체크**: 재체크 전에 API 서버 연결 확인
3. **대체 스크래핑 방법**: 외부 API 사용 (예: Instagram Graph API)

