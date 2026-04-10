-- Custom Forms System Migration V2
-- Version: 2.0.0
-- Date: 2024-12-23
-- Changes: 확장된 필드 구조, Google Sheets 연동 정보 추가

-- 기존 테이블 삭제 (있다면)
DROP TABLE IF EXISTS public.processing_queue CASCADE;
DROP TABLE IF EXISTS public.form_responses_temp CASCADE;
DROP TABLE IF EXISTS public.forms CASCADE;

-- 1. Forms 테이블 (확장)
CREATE TABLE public.forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- 기본 정보
  title TEXT NOT NULL DEFAULT '고객 정보 수집',
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  
  -- 필드 설정 (확장)
  fields JSONB DEFAULT '{
    "default": {
      "name": {"label": "성함", "type": "text", "required": true, "order": 1},
      "phone": {"label": "연락처", "type": "tel", "required": true, "order": 2},
      "email": {"label": "메일주소", "type": "email", "required": true, "order": 3},
      "source": {"label": "어디에서 신청주셨나요?", "type": "text", "required": false, "order": 4},
      "threadsUrl": {"label": "후기 작성할 스레드 URL", "type": "url", "required": false, "order": 5},
      "instagramUrl": {"label": "후기 작성할 인스타그램 URL", "type": "url", "required": false, "order": 6},
      "blogUrl": {"label": "후기 작성할 블로그 URL", "type": "url", "required": false, "order": 7},
      "privacyConsent": {"label": "개인정보 활용 동의", "type": "checkbox", "required": true, "order": 8}
    },
    "custom": []
  }'::jsonb,
  
  -- 선정 기준
  settings JSONB DEFAULT '{
    "selectionCriteria": {
      "threads": 500,
      "blog": 300,
      "instagram": 1000
    },
    "theme": {
      "primaryColor": "#3B82F6",
      "logo": null
    }
  }'::jsonb,
  
  -- Google Sheets 연동
  google_sheet_id TEXT, -- 스프레드시트 ID
  google_sheet_url TEXT, -- 공유 링크
  google_sheet_name TEXT, -- 시트 이름
  google_sheet_last_sync TIMESTAMP WITH TIME ZONE,
  
  -- 상태
  is_active BOOLEAN DEFAULT true,
  response_count INTEGER DEFAULT 0,
  selected_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. 커스텀 필드 템플릿 테이블 (새로 추가)
CREATE TABLE public.form_field_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  field_config JSONB NOT NULL, -- 재사용 가능한 필드 설정
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. 임시 응답 테이블 (확장)
CREATE TABLE public.form_responses_temp (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
  
  -- 응답 데이터
  data JSONB NOT NULL, -- 모든 필드 응답
  
  -- 핵심 필드 (인덱싱용)
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  
  -- SNS 체크 결과
  sns_check_result JSONB DEFAULT '{
    "threads": {"url": null, "followers": 0, "checked": false, "error": null},
    "instagram": {"url": null, "followers": 0, "checked": false, "error": null},
    "blog": {"url": null, "neighbors": 0, "checked": false, "error": null}
  }'::jsonb,
  
  -- 선정 결과
  is_selected BOOLEAN,
  selection_reason TEXT,
  
  -- 처리 상태
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'archived', 'error')),
  error_message TEXT,
  
  -- Google Sheets 동기화
  synced_to_sheets BOOLEAN DEFAULT false,
  sheet_row_number INTEGER,
  
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. 처리 큐 테이블
CREATE TABLE public.processing_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  response_id UUID REFERENCES public.form_responses_temp(id) ON DELETE CASCADE NOT NULL,
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Google Sheets 동기화 로그
CREATE TABLE public.sheets_sync_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- 'create_sheet', 'add_row', 'update_row', 'delete_row'
  status TEXT NOT NULL, -- 'success', 'error'
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 인덱스
CREATE INDEX idx_forms_slug ON public.forms(slug);
CREATE INDEX idx_forms_project_id ON public.forms(project_id);
CREATE INDEX idx_forms_user_id ON public.forms(user_id);
CREATE INDEX idx_forms_google_sheet_id ON public.forms(google_sheet_id);

CREATE INDEX idx_responses_form_id ON public.form_responses_temp(form_id);
CREATE INDEX idx_responses_email ON public.form_responses_temp(email);
CREATE INDEX idx_responses_status ON public.form_responses_temp(status);
CREATE INDEX idx_responses_created ON public.form_responses_temp(created_at);
CREATE INDEX idx_responses_is_selected ON public.form_responses_temp(is_selected);

CREATE INDEX idx_queue_response_id ON public.processing_queue(response_id);
CREATE INDEX idx_queue_created ON public.processing_queue(created_at);

-- RLS 정책
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_field_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses_temp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheets_sync_log ENABLE ROW LEVEL SECURITY;

-- Forms 정책
CREATE POLICY "Users can manage own forms" ON public.forms
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view active forms by slug" ON public.forms
  FOR SELECT USING (is_active = true);

-- Field templates 정책
CREATE POLICY "Users can manage own templates" ON public.form_field_templates
  FOR ALL USING (auth.uid() = user_id);

-- Form responses 정책
CREATE POLICY "Anyone can submit responses" ON public.form_responses_temp
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own form responses" ON public.form_responses_temp
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_responses_temp.form_id 
      AND forms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own form responses" ON public.form_responses_temp
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_responses_temp.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- Processing queue 정책
CREATE POLICY "Users can view own queue" ON public.processing_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.form_responses_temp r
      JOIN public.forms f ON r.form_id = f.id
      WHERE r.id = processing_queue.response_id
      AND f.user_id = auth.uid()
    )
  );

-- Sync log 정책
CREATE POLICY "Users can view own sync logs" ON public.sheets_sync_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = sheets_sync_log.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- 함수들
-- 슬러그 생성
CREATE OR REPLACE FUNCTION generate_unique_slug()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_slug TEXT;
  slug_exists BOOLEAN;
BEGIN
  LOOP
    new_slug := lower(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.forms WHERE slug = new_slug) INTO slug_exists;
    EXIT WHEN NOT slug_exists;
  END LOOP;
  RETURN new_slug;
END;
$$;

-- 폼 생성 시 슬러그 자동 생성
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

-- 응답 수 업데이트
CREATE OR REPLACE FUNCTION update_form_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.forms 
    SET 
      response_count = (
        SELECT COUNT(*) FROM public.form_responses_temp 
        WHERE form_id = NEW.form_id
      ),
      selected_count = (
        SELECT COUNT(*) FROM public.form_responses_temp 
        WHERE form_id = NEW.form_id AND is_selected = true
      )
    WHERE id = NEW.form_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forms 
    SET 
      response_count = (
        SELECT COUNT(*) FROM public.form_responses_temp 
        WHERE form_id = OLD.form_id
      ),
      selected_count = (
        SELECT COUNT(*) FROM public.form_responses_temp 
        WHERE form_id = OLD.form_id AND is_selected = true
      )
    WHERE id = OLD.form_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_form_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.form_responses_temp
  FOR EACH ROW
  EXECUTE FUNCTION update_form_counts();

-- 자동 삭제 함수
CREATE OR REPLACE FUNCTION auto_delete_old_responses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Google Sheets에 동기화된 1일 이상 된 데이터 삭제
  DELETE FROM public.form_responses_temp 
  WHERE status = 'archived' 
  AND synced_to_sheets = true
  AND created_at < NOW() - INTERVAL '1 day';
  
  -- 7일 이상 된 에러 데이터 삭제
  DELETE FROM public.form_responses_temp 
  WHERE status = 'error' 
  AND created_at < NOW() - INTERVAL '7 days';
  
  -- 30일 이상 된 동기화 로그 삭제
  DELETE FROM public.sheets_sync_log
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Updated_at 트리거
CREATE TRIGGER update_forms_updated_at 
  BEFORE UPDATE ON public.forms
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 권한 부여
GRANT ALL ON public.forms TO authenticated;
GRANT ALL ON public.form_field_templates TO authenticated;
GRANT ALL ON public.form_responses_temp TO authenticated;
GRANT ALL ON public.processing_queue TO authenticated;
GRANT ALL ON public.sheets_sync_log TO authenticated;
GRANT INSERT ON public.form_responses_temp TO anon;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Custom Forms V2 migration completed successfully';
END $$;