# 자체 폼 시스템 아키텍처 문서

## 📋 개요
Google Sheets 의존성을 제거하고 자체 폼 시스템을 구축하여 완전한 자동화를 실현합니다.
Supabase 무료 플랜을 유지하면서 무제한 응답을 처리할 수 있는 효율적인 시스템입니다.

## 🎯 목표
1. **무료 유지**: Supabase 500MB 한도 내 운영
2. **완전 자동화**: 폼 생성부터 이메일 발송까지
3. **실시간 처리**: 10초 내 모든 처리 완료
4. **무제한 확장**: 응답 수 제한 없음

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Custom Form   │────▶│  Supabase Queue  │────▶│  SNS Checker    │
│   (Public URL)  │     │   (Temporary)    │     │  (Parallel)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                          │
                                ▼                          ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Google Sheets   │◀────│   Processor     │
                        │   (Permanent)    │     │   (Selection)   │
                        └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                  ┌─────────────────┐
                                                  │  Email Sender   │
                                                  │    (Gmail)      │
                                                  └─────────────────┘
```

## 💾 데이터베이스 설계

### 1. Forms 테이블 (forms)
```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '고객 정보 수집',
  slug TEXT UNIQUE NOT NULL, -- 고유 URL용
  fields JSONB DEFAULT '{}', -- 폼 필드 설정
  settings JSONB DEFAULT '{}', -- 선정 기준 등
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_forms_slug ON forms(slug);
CREATE INDEX idx_forms_project_id ON forms(project_id);
```

### 2. 임시 응답 테이블 (form_responses_temp)
```sql
CREATE TABLE form_responses_temp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  data JSONB NOT NULL, -- 모든 응답 데이터
  sns_check_result JSONB, -- SNS 체크 결과
  status TEXT DEFAULT 'pending', -- pending, processing, completed, archived
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_responses_form_id ON form_responses_temp(form_id);
CREATE INDEX idx_responses_status ON form_responses_temp(status);
CREATE INDEX idx_responses_created ON form_responses_temp(created_at);

-- 자동 삭제 정책 (1일 이상 된 처리 완료 데이터)
CREATE OR REPLACE FUNCTION auto_delete_old_responses()
RETURNS void AS $$
BEGIN
  DELETE FROM form_responses_temp 
  WHERE status = 'archived' 
  AND created_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;
```

### 3. 처리 큐 테이블 (processing_queue)
```sql
CREATE TABLE processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES form_responses_temp(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 데이터 플로우

### Phase 1: 폼 생성
```typescript
1. 프로젝트 생성/수정 시
2. 자동으로 폼 생성
3. 고유 URL 발급: /form/{slug}
4. QR 코드 생성
```

### Phase 2: 응답 수집
```typescript
1. 사용자가 폼 제출
2. form_responses_temp에 저장
3. processing_queue에 추가
4. 실시간 알림 (웹소켓)
```

### Phase 3: 자동 처리
```typescript
1. Queue Worker 시작
2. SNS 병렬 체크 (Promise.all)
3. 선정 로직 적용
4. Google Sheets 저장
5. 이메일 발송 (선택)
6. temp 테이블에서 삭제
```

## 🎨 UI 컴포넌트 구조

### 1. DB 관리 탭 (기존 화면 수정)
```
/src/app/automation/customer-acquisition/
  └── components/
      ├── Step2Tabs.tsx (새로 추가)
      ├── CustomFormTab.tsx
      └── GoogleSheetsTab.tsx (기존)
```

### 2. 자체 폼 (공개 페이지)
```
/src/app/form/[slug]/
  └── page.tsx (동적 라우트)
```

### 3. 실시간 모니터링
```
/src/components/
  └── ResponseMonitor.tsx (실시간 업데이트)
```

## 🚀 구현 계획

### Sprint 1: 기반 구축 (Day 1-2)
- [ ] Feature branch 생성
- [ ] 환경 변수 설정
- [ ] DB 마이그레이션
- [ ] 기본 API 엔드포인트

### Sprint 2: 폼 시스템 (Day 3-4)
- [ ] 폼 생성 API
- [ ] 공개 폼 페이지
- [ ] 응답 수집 API
- [ ] 중복 방지 로직

### Sprint 3: 자동 처리 (Day 5-6)
- [ ] SNS 병렬 체크
- [ ] 선정 로직
- [ ] Google Sheets API 연동
- [ ] 자동 삭제 스케줄러

### Sprint 4: UI/UX (Day 7)
- [ ] Step2 탭 UI
- [ ] 실시간 모니터링
- [ ] QR 코드 생성
- [ ] 통계 대시보드

## 🔧 기술 스택

### Backend
- Next.js API Routes
- Supabase (PostgreSQL + Realtime)
- Google Sheets API
- Node.js Cron (자동 삭제)

### Frontend
- React + TypeScript
- Tailwind CSS
- Framer Motion (애니메이션)
- React Hook Form (폼 처리)
- QRCode.js (QR 생성)

### 병렬 처리
- Promise.all() for SNS checks
- Worker pattern for queue
- Batch processing for Sheets

## 📊 성능 목표

| 항목 | 목표 | 측정 방법 |
|------|------|----------|
| 폼 응답 처리 | < 10초 | 제출 → 완료 시간 |
| SNS 체크 | < 5초 | 3개 병렬 처리 |
| DB 용량 | < 50MB | 일일 모니터링 |
| 동시 처리 | 100명/분 | 부하 테스트 |

## 🔐 보안 고려사항

1. **Rate Limiting**: 폼 제출 제한 (IP당 10회/분)
2. **CSRF Protection**: 폼 토큰 검증
3. **Data Validation**: Zod 스키마 검증
4. **SQL Injection**: Prepared statements
5. **XSS Prevention**: 입력값 sanitize

## 📈 모니터링

### 대시보드 메트릭
- 실시간 응답 수
- 선정률 통계
- 처리 속도
- 에러율
- DB 사용량

### 알림 설정
- 에러 발생 시
- DB 용량 80% 도달
- 일일 처리 완료

## 🔄 롤백 계획

### 문제 발생 시
1. Feature flag OFF
2. 기존 Google Sheets 탭 활성화
3. 데이터 백업 복구
4. 사용자 알림

### 데이터 백업
- 일일 Google Sheets 전체 백업
- Supabase 자동 백업 (7일)
- 로컬 JSON 백업

## 📝 테스트 계획

### Unit Tests
- API 엔드포인트
- 선정 로직
- 중복 체크

### Integration Tests
- 폼 제출 → 처리 완료
- SNS 체크 정확도
- Google Sheets 동기화

### Load Tests
- 동시 100명 제출
- 1000개 데이터 처리
- 메모리 사용량

---

**Version**: 1.0.0
**Last Updated**: 2024-12-23
**Author**: AIMAX Team