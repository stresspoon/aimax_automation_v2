-- form_responses_temp 테이블에 project_id 컬럼 추가
ALTER TABLE public.form_responses_temp 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- 기존 데이터에 project_id 설정 (forms 테이블의 project_id를 참조)
UPDATE public.form_responses_temp r
SET project_id = f.project_id
FROM public.forms f
WHERE r.form_id = f.id
  AND r.project_id IS NULL;

-- project_id에 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_form_responses_temp_project_id 
ON public.form_responses_temp(project_id);

-- project_id와 form_id 복합 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_form_responses_temp_project_form 
ON public.form_responses_temp(project_id, form_id);

-- RLS 정책 업데이트 - 프로젝트별 격리 강화
DROP POLICY IF EXISTS "Users can view their own form responses" ON public.form_responses_temp;

CREATE POLICY "Users can view their project form responses" ON public.form_responses_temp
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_responses_temp.form_id
        AND f.user_id = auth.uid()
    )
  );

-- 서비스 역할은 모든 권한
CREATE POLICY "Service role has full access" ON public.form_responses_temp
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');