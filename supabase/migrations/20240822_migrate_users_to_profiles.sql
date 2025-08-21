-- 기존 auth.users의 모든 사용자를 user_profiles 테이블로 마이그레이션
-- 이미 존재하는 사용자는 업데이트, 새 사용자는 추가

INSERT INTO public.user_profiles (id, email, full_name, role, plan, status, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as full_name,
    COALESCE(up.role, 'user') as role,  -- 기존 role이 있으면 유지, 없으면 'user'
    COALESCE(up.plan, 'basic') as plan,  -- 기존 plan이 있으면 유지, 없으면 'basic'
    COALESCE(up.status, 'active') as status,  -- 기존 status가 있으면 유지, 없으면 'active'
    COALESCE(au.created_at, NOW()) as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(user_profiles.full_name, EXCLUDED.full_name),
    updated_at = NOW();

-- 통계 확인
DO $$
DECLARE
    auth_count INTEGER;
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM public.user_profiles;
    
    RAISE NOTICE 'Auth users: %, User profiles: %', auth_count, profile_count;
END $$;