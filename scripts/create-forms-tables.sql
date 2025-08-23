-- Custom Forms System Tables
-- 이 SQL을 Supabase Dashboard > SQL Editor에서 실행하세요

-- 1. Forms 테이블 (이미 있으면 스킵)
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT '고객 정보 수집',
  description TEXT,
  slug TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 8),
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
  google_sheet_id TEXT,
  google_sheet_url TEXT,
  google_sheet_name TEXT,
  google_sheet_last_sync TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  response_count INTEGER DEFAULT 0,
  selected_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Form Responses Temp 테이블
CREATE TABLE IF NOT EXISTS public.form_responses_temp (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
  data JSONB NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  sns_check_result JSONB DEFAULT '{
    "threads": {"url": null, "followers": 0, "checked": false, "error": null},
    "instagram": {"url": null, "followers": 0, "checked": false, "error": null},
    "blog": {"url": null, "neighbors": 0, "checked": false, "error": null}
  }'::jsonb,
  is_selected BOOLEAN,
  selection_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'archived', 'error')),
  error_message TEXT,
  synced_to_sheets BOOLEAN DEFAULT false,
  sheet_row_number INTEGER,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Processing Queue 테이블
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
CREATE INDEX IF NOT EXISTS idx_responses_email ON public.form_responses_temp(email);
CREATE INDEX IF NOT EXISTS idx_responses_status ON public.form_responses_temp(status);
CREATE INDEX IF NOT EXISTS idx_queue_response_id ON public.processing_queue(response_id);

-- 5. RLS 정책
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses_temp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;

-- Forms 정책
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'forms' 
    AND policyname = 'Users can manage own forms'
  ) THEN
    CREATE POLICY "Users can manage own forms" ON public.forms
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'forms' 
    AND policyname = 'Public can view active forms by slug'
  ) THEN
    CREATE POLICY "Public can view active forms by slug" ON public.forms
      FOR SELECT USING (is_active = true);
  END IF;

  -- Form responses 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_responses_temp' 
    AND policyname = 'Anyone can submit responses'
  ) THEN
    CREATE POLICY "Anyone can submit responses" ON public.form_responses_temp
      FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_responses_temp' 
    AND policyname = 'Users can view own form responses'
  ) THEN
    CREATE POLICY "Users can view own form responses" ON public.form_responses_temp
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.forms 
          WHERE forms.id = form_responses_temp.form_id 
          AND forms.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_responses_temp' 
    AND policyname = 'Users can update own form responses'
  ) THEN
    CREATE POLICY "Users can update own form responses" ON public.form_responses_temp
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.forms 
          WHERE forms.id = form_responses_temp.form_id 
          AND forms.user_id = auth.uid()
        )
      );
  END IF;

  -- Processing queue 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'processing_queue' 
    AND policyname = 'Users can view own queue'
  ) THEN
    CREATE POLICY "Users can view own queue" ON public.processing_queue
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.form_responses_temp r
          JOIN public.forms f ON r.form_id = f.id
          WHERE r.id = processing_queue.response_id
          AND f.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 6. 권한 부여
GRANT ALL ON public.forms TO authenticated;
GRANT ALL ON public.form_responses_temp TO authenticated;
GRANT ALL ON public.processing_queue TO authenticated;
GRANT INSERT ON public.form_responses_temp TO anon;

-- 완료 메시지
SELECT 'Forms tables created successfully!' as message;