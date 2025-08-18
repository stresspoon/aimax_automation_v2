# 환경 변수 설정 가이드

## 필수 환경 변수

프로젝트를 실행하기 위해 `.env.local` 파일을 생성하고 다음 환경 변수를 설정해야 합니다:

```env
# Supabase 설정 (필수)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 앱 URL (선택사항 - 기본값 자동 설정됨)
NEXT_PUBLIC_BASE_URL=http://localhost:3001

# JWT Secret (선택사항)
JWT_SECRET=your_jwt_secret_key

# Gemini API Key (선택사항 - 이미지 생성에 필요)
GEMINI_API_KEY=your_gemini_api_key

# SendGrid API Key (선택사항 - 이메일 발송에 필요)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender_email
```

## Supabase 설정 방법

1. [Supabase](https://supabase.com) 대시보드에 로그인
2. 프로젝트 선택 또는 새 프로젝트 생성
3. Settings > API 메뉴로 이동
4. Project URL과 anon public key 복사
5. `.env.local` 파일에 붙여넣기

## Google OAuth 설정

Supabase 대시보드에서:
1. Authentication > Providers 메뉴로 이동
2. Google 활성화
3. Google Cloud Console에서 OAuth 2.0 Client ID 생성
4. Authorized redirect URIs에 다음 추가:
   - `https://[your-project-ref].supabase.co/auth/v1/callback`
5. Client ID와 Client Secret을 Supabase에 입력

## 주의사항

- `.env.local` 파일은 절대 Git에 커밋하지 마세요
- 프로덕션 배포 시 호스팅 플랫폼(Vercel, Netlify 등)에 환경 변수 설정
- `NEXT_PUBLIC_` 접두사가 붙은 변수는 클라이언트에서 접근 가능