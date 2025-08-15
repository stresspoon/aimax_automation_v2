-- 현재 public 스키마의 모든 테이블 확인
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- review 관련 테이블들의 RLS 정책 확인 (Performance Advisor 경고 관련)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('review_packs', 'review_invites', 'review_drafts', 'review_submissions')
ORDER BY tablename, policyname;

-- 사용하지 않는 테이블 삭제 (주의: 데이터가 영구 삭제됩니다!)
-- 아래 명령어는 주석 처리되어 있습니다. 필요한 경우에만 주석을 해제하고 실행하세요.
/*
DROP TABLE IF EXISTS public.review_packs CASCADE;
DROP TABLE IF EXISTS public.review_invites CASCADE;
DROP TABLE IF EXISTS public.review_drafts CASCADE;
DROP TABLE IF EXISTS public.review_submissions CASCADE;
*/

-- 또는 review 테이블들의 RLS만 비활성화하여 경고 제거
-- (테이블은 유지하되 RLS 경고만 제거)
/*
ALTER TABLE IF EXISTS public.review_packs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_drafts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_submissions DISABLE ROW LEVEL SECURITY;
*/

-- AIMAX 프로젝트에서 실제로 사용하는 테이블들만 확인
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'campaigns', 'projects', 'orders', 'tool_purchases', 'applicants')
ORDER BY tablename;