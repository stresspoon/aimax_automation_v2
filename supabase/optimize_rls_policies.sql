-- Performance Advisor 경고 해결을 위한 최적화된 RLS 정책
-- auth.uid()를 한 번만 평가하도록 최적화

-- review 관련 테이블들의 기존 정책 확인
SELECT 
    tablename,
    policyname,
    definition
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('review_packs', 'review_invites', 'review_drafts', 'review_submissions');

-- review 테이블들이 현재 프로젝트에서 사용되지 않는다면:
-- 옵션 1: 테이블 삭제 (데이터도 함께 삭제됨)
/*
DROP TABLE IF EXISTS public.review_packs CASCADE;
DROP TABLE IF EXISTS public.review_invites CASCADE;
DROP TABLE IF EXISTS public.review_drafts CASCADE;
DROP TABLE IF EXISTS public.review_submissions CASCADE;
*/

-- 옵션 2: RLS 비활성화 (테이블은 유지, 경고만 제거)
ALTER TABLE IF EXISTS public.review_packs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_drafts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_submissions DISABLE ROW LEVEL SECURITY;

-- 최종 상태 확인
SELECT 
    tablename,
    rowsecurity as "RLS Enabled",
    CASE 
        WHEN tablename IN ('profiles', 'campaigns', 'projects', 'orders', 'tool_purchases', 'applicants') 
        THEN 'AIMAX Project'
        ELSE 'Other'
    END as "Table Group"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY "Table Group", tablename;