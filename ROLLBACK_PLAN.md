# 🔄 롤백 계획 (Rollback Plan)

## 현재 브랜치 구조
```
main (안정 버전 - Google Sheets 기반)
  └── feature/custom-forms (개발 중 - 자체 폼 시스템)
```

## 🚨 긴급 롤백 방법

### 1. Vercel에서 즉시 롤백
```bash
# Vercel 대시보드에서
1. Settings → Git
2. Production Branch: main (확인)
3. Deployments → 이전 배포 선택 → Promote to Production
```

### 2. Git에서 롤백
```bash
# 현재 작업 저장
git add .
git commit -m "WIP: Custom forms development"

# main 브랜치로 전환
git checkout main

# 강제 배포 (필요 시)
git commit --allow-empty -m "Force rollback to stable version"
git push origin main
```

### 3. Feature Flag로 비활성화
```env
# .env.local에서
NEXT_PUBLIC_FEATURE_CUSTOM_FORMS=false
NEXT_PUBLIC_FEATURE_GOOGLE_SHEETS=true
```

## 📊 데이터 백업 및 복구

### 백업 위치
1. **Google Sheets**: 모든 처리된 데이터 영구 저장
2. **Supabase 백업**: Dashboard → Settings → Backups
3. **로컬 백업**: `/backups/` 폴더 (gitignore)

### 복구 스크립트
```bash
# 데이터 복구 (필요 시)
npm run restore:backup -- --date=2024-12-23
```

## 🔍 체크리스트

### 롤백 전 확인
- [ ] 현재 처리 중인 데이터 확인
- [ ] 사용자에게 공지 발송
- [ ] 백업 생성 완료

### 롤백 후 확인
- [ ] 기존 기능 정상 작동
- [ ] 데이터 무결성 확인
- [ ] 에러 로그 모니터링

## 📱 사용자 공지 템플릿

```
안녕하세요, AIMAX입니다.

시스템 안정성 향상을 위해 잠시 이전 버전으로 복구합니다.
- 영향: 자체 폼 기능 일시 중단
- 대안: Google Sheets 연동 사용
- 예상 시간: 약 30분

불편을 드려 죄송합니다.
```

## 🛠️ 문제별 대응 방법

### Case 1: 데이터 유실
→ Google Sheets 백업에서 복구

### Case 2: 성능 저하
→ Feature Flag OFF → 캐시 클리어

### Case 3: 배포 실패
→ Vercel에서 이전 배포 Promote

### Case 4: DB 오류
→ Supabase 백업 복구 → 마이그레이션 재실행

---

**긴급 연락**: 문제 발생 시 즉시 팀 슬랙 #emergency 채널 알림