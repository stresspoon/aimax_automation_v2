-- Supabase에서 이 스크립트를 실행하기 전에:
-- 1. 먼저 001_initial_schema.sql을 실행했는지 확인하세요
-- 2. 아래 쿼리로 현재 테이블을 확인하세요:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 기존 테이블에만 RLS 활성화 (IF EXISTS 사용)
DO $$ 
BEGIN
    -- profiles 테이블 RLS 설정
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.profiles
            FOR SELECT USING (auth.uid() = id);
        
        CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.profiles
            FOR UPDATE USING (auth.uid() = id);
    END IF;

    -- campaigns 테이블 RLS 설정
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaigns') THEN
        ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can view own campaigns" ON public.campaigns
            FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can insert own campaigns" ON public.campaigns
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can update own campaigns" ON public.campaigns
            FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can delete own campaigns" ON public.campaigns
            FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- projects 테이블 RLS 설정
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
        ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can view own projects" ON public.projects
            FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can insert own projects" ON public.projects
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can update own projects" ON public.projects
            FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can delete own projects" ON public.projects
            FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- orders 테이블 RLS 설정
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can view own orders" ON public.orders
            FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can insert own orders" ON public.orders
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can update own orders" ON public.orders
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- tool_purchases 테이블 RLS 설정
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tool_purchases') THEN
        ALTER TABLE public.tool_purchases ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can view own tool purchases" ON public.tool_purchases
            FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can insert own tool purchases" ON public.tool_purchases
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- applicants 테이블이 있다면 RLS 설정
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'applicants') THEN
        ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
        
        -- applicants 테이블은 user_id 컬럼이 있는지 확인 필요
        -- 만약 다른 구조라면 적절히 수정하세요
        IF EXISTS (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'applicants' 
            AND column_name = 'user_id'
        ) THEN
            CREATE POLICY IF NOT EXISTS "Users can view own applicants" ON public.applicants
                FOR SELECT USING (auth.uid() = user_id);
            
            CREATE POLICY IF NOT EXISTS "Users can insert own applicants" ON public.applicants
                FOR INSERT WITH CHECK (auth.uid() = user_id);
            
            CREATE POLICY IF NOT EXISTS "Users can update own applicants" ON public.applicants
                FOR UPDATE USING (auth.uid() = user_id);
            
            CREATE POLICY IF NOT EXISTS "Users can delete own applicants" ON public.applicants
                FOR DELETE USING (auth.uid() = user_id);
        END IF;
    END IF;
END $$;

-- RLS 활성화 상태 확인
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;