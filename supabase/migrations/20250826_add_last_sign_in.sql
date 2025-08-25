-- last_sign_in_at 필드 추가
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- auth.users의 last_sign_in_at을 동기화하는 트리거 함수
CREATE OR REPLACE FUNCTION public.sync_last_sign_in()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    last_sign_in_at = NEW.last_sign_in_at,
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users 업데이트 시 트리거
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF last_sign_in_at, updated_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_last_sign_in();

-- 기존 사용자들의 last_sign_in_at 동기화
UPDATE public.user_profiles p
SET last_sign_in_at = u.last_sign_in_at
FROM auth.users u
WHERE p.id = u.id AND u.last_sign_in_at IS NOT NULL;