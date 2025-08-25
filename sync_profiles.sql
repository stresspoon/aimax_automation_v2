-- 1. profiles 테이블의 데이터를 user_profiles로 동기화
INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name, 
    role, 
    plan, 
    status, 
    created_at, 
    updated_at,
    is_unlimited,
    unlimited_reason,
    unlimited_until,
    last_sign_in_at
)
SELECT 
    p.id,
    p.email,
    COALESCE(p.name, split_part(p.email, '@', 1)) as full_name,
    COALESCE(up.role, 'user') as role,
    COALESCE(up.plan, 'basic') as plan, 
    COALESCE(up.status, 'active') as status,
    p.created_at,
    p.updated_at,
    COALESCE(up.is_unlimited, false) as is_unlimited,
    up.unlimited_reason,
    up.unlimited_until,
    au.last_sign_in_at
FROM public.profiles p
LEFT JOIN public.user_profiles up ON p.id = up.id
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(user_profiles.full_name, EXCLUDED.full_name),
    role = COALESCE(user_profiles.role, EXCLUDED.role),
    plan = COALESCE(user_profiles.plan, EXCLUDED.plan),
    status = COALESCE(user_profiles.status, EXCLUDED.status),
    updated_at = NOW(),
    last_sign_in_at = COALESCE(EXCLUDED.last_sign_in_at, user_profiles.last_sign_in_at);

-- 2. auth.users에만 있고 어느 프로필 테이블에도 없는 사용자 추가
INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name, 
    role, 
    plan, 
    status, 
    created_at, 
    updated_at,
    last_sign_in_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name', 
        au.raw_user_meta_data->>'name', 
        split_part(au.email, '@', 1)
    ) as full_name,
    'user' as role,
    'basic' as plan,
    'active' as status,
    au.created_at,
    NOW() as updated_at,
    au.last_sign_in_at
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 3. 결과 확인
SELECT 
    'auth.users' as source,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'profiles' as source,
    COUNT(*) as count
FROM public.profiles
UNION ALL
SELECT 
    'user_profiles' as source,
    COUNT(*) as count
FROM public.user_profiles;

-- 4. user_profiles에 없는 profiles 사용자 확인
SELECT p.email, p.created_at
FROM public.profiles p
LEFT JOIN public.user_profiles up ON p.id = up.id
WHERE up.id IS NULL;

-- 5. user_profiles에 없는 auth.users 사용자 확인
SELECT au.email, au.created_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;