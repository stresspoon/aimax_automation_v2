-- handle_new_user 트리거 수정: role 컬럼에 user_role ENUM 캐스팅 추가
-- 원인: COALESCE(text, text) 결과가 text 타입인데 user_role ENUM 컬럼에 INSERT 시 타입 불일치 에러
-- "column 'role' is of type user_role but expression is of type text"

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- user_profiles에 자동 삽입
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
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'plan', 'basic'),
    'active',
    NEW.created_at,
    NEW.updated_at,
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW(),
    last_sign_in_at = EXCLUDED.last_sign_in_at;

  -- profiles에도 삽입 (호환성 유지)
  INSERT INTO public.profiles (
    id,
    email,
    name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
