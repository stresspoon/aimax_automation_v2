-- Custom Forms System Migration
-- Version: 1.0.0
-- Date: 2024-12-23

-- 1. Forms 테이블 생성
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT '고객 정보 수집',
  slug TEXT UNIQUE NOT NULL,
  fields JSONB DEFAULT '{"name": true, "email": true, "phone": false, "threadsUrl": false, "instagramUrl": false, "blogUrl": false}'::jsonb,
  settings JSONB DEFAULT '{"selectionCriteria": {"threads": 500, "blog": 300, "instagram": 1000}}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  response_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. 임시 응답 테이블
CREATE TABLE IF NOT EXISTS public.form_responses_temp (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  data JSONB NOT NULL,
  sns_check_result JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'archived', 'error')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. 처리 큐 테이블
CREATE TABLE IF NOT EXISTS public.processing_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  response_id UUID REFERENCES public.form_responses_temp(id) ON DELETE CASCADE NOT NULL,
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_forms_slug ON public.forms(slug);
CREATE INDEX IF NOT EXISTS idx_forms_project_id ON public.forms(project_id);
CREATE INDEX IF NOT EXISTS idx_forms_user_id ON public.forms(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON public.form_responses_temp(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_status ON public.form_responses_temp(status);
CREATE INDEX IF NOT EXISTS idx_responses_created ON public.form_responses_temp(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_response_id ON public.processing_queue(response_id);
CREATE INDEX IF NOT EXISTS idx_queue_created ON public.processing_queue(created_at);

-- 5. RLS 정책
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses_temp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;

-- Forms 정책
CREATE POLICY "Users can view own forms" ON public.forms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own forms" ON public.forms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own forms" ON public.forms
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own forms" ON public.forms
  FOR DELETE USING (auth.uid() = user_id);

-- Public can view active forms by slug (for form submission)
CREATE POLICY "Public can view active forms by slug" ON public.forms
  FOR SELECT USING (is_active = true);

-- Form responses 정책 (공개 제출 허용)
CREATE POLICY "Anyone can submit form responses" ON public.form_responses_temp
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view responses for their forms" ON public.form_responses_temp
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_responses_temp.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- Processing queue 정책
CREATE POLICY "Users can view their processing queue" ON public.processing_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.form_responses_temp r
      JOIN public.forms f ON r.form_id = f.id
      WHERE r.id = processing_queue.response_id
      AND f.user_id = auth.uid()
    )
  );

-- 6. 자동 삭제 함수
CREATE OR REPLACE FUNCTION auto_delete_old_responses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1일 이상 된 archived 상태 데이터 삭제
  DELETE FROM public.form_responses_temp 
  WHERE status = 'archived' 
  AND created_at < NOW() - INTERVAL '1 day';
  
  -- 7일 이상 된 error 상태 데이터 삭제
  DELETE FROM public.form_responses_temp 
  WHERE status = 'error' 
  AND created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- 7. Updated_at 트리거
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. 슬러그 생성 함수
CREATE OR REPLACE FUNCTION generate_unique_slug()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_slug TEXT;
  slug_exists BOOLEAN;
BEGIN
  LOOP
    -- 8자리 랜덤 문자열 생성
    new_slug := lower(substring(md5(random()::text) from 1 for 8));
    
    -- 중복 체크
    SELECT EXISTS(SELECT 1 FROM public.forms WHERE slug = new_slug) INTO slug_exists;
    
    EXIT WHEN NOT slug_exists;
  END LOOP;
  
  RETURN new_slug;
END;
$$;

-- 9. 폼 생성 시 자동 슬러그 생성 트리거
CREATE OR REPLACE FUNCTION set_form_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_unique_slug();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_form_slug_trigger
  BEFORE INSERT ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION set_form_slug();

-- 10. 응답 수 카운터 업데이트 함수
CREATE OR REPLACE FUNCTION update_form_response_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forms 
    SET response_count = response_count + 1
    WHERE id = NEW.form_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forms 
    SET response_count = GREATEST(response_count - 1, 0)
    WHERE id = OLD.form_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_response_count_trigger
  AFTER INSERT OR DELETE ON public.form_responses_temp
  FOR EACH ROW
  EXECUTE FUNCTION update_form_response_count();

-- 11. 권한 부여
GRANT ALL ON public.forms TO authenticated;
GRANT ALL ON public.form_responses_temp TO authenticated;
GRANT ALL ON public.processing_queue TO authenticated;
GRANT INSERT ON public.form_responses_temp TO anon; -- 익명 사용자도 폼 제출 가능

-- 마이그레이션 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Custom Forms migration completed successfully';
END $$;