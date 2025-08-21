-- 관리자 프로필 수정 스크립트
-- 이미 생성된 admin@aimax.kr 사용자의 프로필을 생성/업데이트합니다

-- 1. 먼저 테이블이 없다면 생성
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

-- 2. 기존 admin@aimax.kr 사용자의 프로필 생성 또는 업데이트
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
            
        RAISE NOTICE 'admin@aimax.kr 프로필이 성공적으로 설정되었습니다.';
    ELSE
        RAISE NOTICE 'admin@aimax.kr 사용자를 찾을 수 없습니다. 먼저 사용자를 생성하세요.';
    END IF;
END $$;