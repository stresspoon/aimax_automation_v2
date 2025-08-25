-- profiles 테이블 변경 시 user_profiles 자동 동기화 트리거

-- 1. 트리거 함수 생성
CREATE OR REPLACE FUNCTION sync_profiles_to_user_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT 또는 UPDATE 시
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO public.user_profiles (
      id, 
      email, 
      full_name, 
      role, 
      plan, 
      status, 
      created_at, 
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.name, split_part(NEW.email, '@', 1)),
      'user',  -- profiles 테이블에는 role 컬럼이 없음
      'basic', -- profiles 테이블에는 plan 컬럼이 없음
      'active', -- profiles 테이블에는 status 컬럼이 없음
      COALESCE(NEW.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(user_profiles.full_name, EXCLUDED.full_name),
      updated_at = NOW();
    RETURN NEW;
  END IF;
  
  -- DELETE 시
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_profiles WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 트리거 생성
DROP TRIGGER IF EXISTS sync_profiles_trigger ON public.profiles;
CREATE TRIGGER sync_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profiles_to_user_profiles();

-- 3. auth.users 신규 가입 시 user_profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. auth.users 트리거 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();