-- 완전한 관리자 설정 스크립트
-- 이 스크립트는 테이블 생성부터 관리자 프로필 설정까지 모두 처리합니다

-- 1. user_profiles 테이블 생성 (이미 있으면 무시)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    plan TEXT DEFAULT 'basic', 
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. RLS 활성화
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS 정책 생성 (이미 있으면 무시)
DO $$
BEGIN
    -- 사용자가 자신의 프로필을 볼 수 있는 정책
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON public.user_profiles
            FOR SELECT USING (auth.uid() = id);
    END IF;
END $$;

-- 4. admin@aimax.kr 사용자 찾아서 프로필 생성/업데이트
DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- admin@aimax.kr 사용자의 ID 조회
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@aimax.kr';
    
    IF admin_id IS NOT NULL THEN
        -- user_profiles 테이블에 데이터 삽입 (이미 존재하면 업데이트)
        INSERT INTO public.user_profiles (id, email, full_name, role, plan, status)
        VALUES (
            admin_id,
            'admin@aimax.kr',
            'AIMAX Administrator',
            'super_admin',
            'enterprise',
            'active'
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'super_admin',
            plan = 'enterprise',
            status = 'active',
            full_name = 'AIMAX Administrator',
            updated_at = TIMEZONE('utc'::text, NOW());
            
        RAISE NOTICE '✅ SUCCESS: admin@aimax.kr 프로필이 설정되었습니다.';
    ELSE
        RAISE NOTICE '⚠️ WARNING: admin@aimax.kr 사용자를 찾을 수 없습니다.';
        RAISE NOTICE '👉 Supabase Dashboard > Authentication > Users에서 먼저 사용자를 생성하세요.';
        RAISE NOTICE '   Email: admin@aimax.kr';
        RAISE NOTICE '   Password: Aimax2024Admin!';
    END IF;
END $$;

-- 5. 결과 확인
SELECT 
    u.email,
    p.role,
    p.plan,
    p.status,
    p.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE u.email = 'admin@aimax.kr';