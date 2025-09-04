# 브랜치 관리 가이드

## 현재 브랜치 상태
- **메인 브랜치**: `main` (안정된 상태)
- **리팩토링 브랜치**: `refactor/customer-acquisition` (작업 진행 중)

## 리팩토링 브랜치 작업
현재 `refactor/customer-acquisition` 브랜치에서 작업 중입니다.
이 브랜치는 customer-acquisition 페이지의 리팩토링을 위해 생성되었습니다.

## 브랜치 간 이동

### 리팩토링 브랜치에서 작업하기
```bash
git checkout refactor/customer-acquisition
```

### 메인 브랜치로 돌아가기
```bash
git checkout main
```

## 리팩토링이 성공했을 때 (머지하기)

### 1. GitHub Pull Request 사용 (권장)
1. GitHub에서 Pull Request 생성: https://github.com/stresspoon/aimax_automation_v2/pull/new/refactor/customer-acquisition
2. 코드 리뷰 후 머지
3. 로컬에서 메인 브랜치 업데이트:
```bash
git checkout main
git pull origin main
```

### 2. 로컬에서 직접 머지
```bash
# 메인 브랜치로 이동
git checkout main

# 최신 상태로 업데이트
git pull origin main

# 리팩토링 브랜치 머지
git merge refactor/customer-acquisition

# 원격에 푸시
git push origin main

# 머지된 브랜치 삭제 (선택사항)
git branch -d refactor/customer-acquisition
git push origin --delete refactor/customer-acquisition
```

## 리팩토링이 실패했을 때 (원래 상태로 복구)

### 방법 1: 브랜치 전환 (가장 안전)
```bash
# 메인 브랜치로 돌아가기
git checkout main

# 리팩토링 브랜치는 그대로 남겨두거나 삭제
# 삭제하려면:
git branch -D refactor/customer-acquisition
git push origin --delete refactor/customer-acquisition
```

### 방법 2: 리팩토링 브랜치에서 변경사항 되돌리기
```bash
# 현재 브랜치 확인
git branch

# 리팩토링 브랜치의 모든 변경사항 되돌리기
git reset --hard origin/main

# 또는 특정 커밋으로 되돌리기
git log --oneline  # 커밋 목록 확인
git reset --hard [커밋ID]
```

### 방법 3: 백업 브랜치 생성 후 초기화
```bash
# 현재 상태를 백업
git checkout refactor/customer-acquisition
git checkout -b backup/refactor-attempt-1

# 원래 브랜치로 돌아가서 초기화
git checkout refactor/customer-acquisition
git reset --hard origin/main
```

## 현재 상태 확인 명령어

### 브랜치 확인
```bash
# 현재 브랜치 확인
git branch

# 모든 브랜치 확인 (원격 포함)
git branch -a

# 현재 브랜치 상태
git status
```

### 변경사항 확인
```bash
# 커밋되지 않은 변경사항 보기
git diff

# 메인 브랜치와 차이점 보기
git diff main

# 커밋 히스토리 보기
git log --oneline -10
```

### 원격 저장소와 동기화 확인
```bash
# 원격 저장소 정보 확인
git remote -v

# 원격 브랜치와 비교
git fetch origin
git status
```

## 주의사항

1. **작업 전 항상 브랜치 확인**: `git branch` 명령으로 현재 브랜치 확인
2. **중요한 변경 전 커밋**: 리팩토링 중간중간 의미있는 단위로 커밋
3. **충돌 방지**: 메인 브랜치의 변경사항을 주기적으로 리팩토링 브랜치에 머지
   ```bash
   git checkout refactor/customer-acquisition
   git merge main
   ```

## 긴급 복구 (최후의 수단)

만약 모든 것이 꼬였다면:

```bash
# 로컬 리포지토리 백업
cp -r ~/Projects/aimax-automation-v2 ~/Projects/aimax-automation-v2-backup

# 모든 로컬 변경사항 버리고 원격 main으로 강제 동기화
git fetch origin
git checkout main
git reset --hard origin/main

# node_modules 재설치 (필요시)
npm run clean
npm install
```

## 현재 세이브 포인트
- **안전한 커밋**: `997a59b` (2025-01-04 기준)
- **브랜치**: `main`이 안정된 상태
- **리팩토링 시작점**: `refactor/customer-acquisition` 브랜치가 main과 동일한 상태에서 시작

## 리팩토링 계획

### 주요 개선 대상
1. **컴포넌트 분리**: 3000줄 이상의 거대한 페이지 파일을 작은 컴포넌트로 분리
2. **상태 관리 개선**: useState 남발 대신 useReducer 또는 Zustand 활용
3. **API 호출 최적화**: 중복 호출 제거, 에러 처리 통합
4. **타입 안정성**: TypeScript 타입 정의 강화
5. **코드 재사용성**: 공통 로직 추출 및 커스텀 훅 생성

위 가이드를 참고하여 안전하게 리팩토링을 진행할 수 있습니다.