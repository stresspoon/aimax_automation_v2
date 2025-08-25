-- 무제한 사용 권한을 위한 필드 추가
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS unlimited_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS unlimited_reason TEXT DEFAULT NULL;

-- 인덱스 추가 (무제한 사용자 빠른 조회)
CREATE INDEX IF NOT EXISTS idx_user_profiles_unlimited 
ON public.user_profiles(is_unlimited) 
WHERE is_unlimited = true;

-- 코멘트 추가
COMMENT ON COLUMN public.user_profiles.is_unlimited IS '무제한 사용 권한 여부';
COMMENT ON COLUMN public.user_profiles.unlimited_until IS '무제한 사용 만료일 (NULL이면 무기한)';
COMMENT ON COLUMN public.user_profiles.unlimited_reason IS '무제한 권한 부여 사유';