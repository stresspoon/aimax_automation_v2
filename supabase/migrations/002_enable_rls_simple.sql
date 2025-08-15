-- 간단한 RLS 활성화 스크립트
-- 현재 Supabase에 있는 테이블에만 적용

-- applicants 테이블 (Security Advisor에서 경고가 난 테이블)
ALTER TABLE IF EXISTS public.applicants ENABLE ROW LEVEL SECURITY;

-- projects 테이블 (Security Advisor에서 경고가 난 테이블)  
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;

-- 다른 테이블들도 있다면 RLS 활성화
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tool_purchases ENABLE ROW LEVEL SECURITY;

-- 현재 public 스키마의 모든 테이블과 RLS 상태 확인
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 참고: RLS 정책(Policy)은 테이블 구조를 확인한 후 별도로 추가해야 합니다.
-- 각 테이블의 컬럼 구조 확인:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'YOUR_TABLE_NAME';