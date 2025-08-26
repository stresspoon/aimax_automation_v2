-- Fix RLS policy for form_responses_temp table
-- 폼 응답 제출 시 RLS 정책 오류 수정

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can submit responses" ON public.form_responses_temp;
DROP POLICY IF EXISTS "Users can view own form responses" ON public.form_responses_temp;
DROP POLICY IF EXISTS "Users can update own form responses" ON public.form_responses_temp;

-- 새로운 정책 생성

-- 1. 누구나 응답 제출 가능 (anon 및 authenticated 모두)
CREATE POLICY "Anyone can submit responses" ON public.form_responses_temp
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- 2. 폼 소유자는 자신의 폼 응답을 볼 수 있음
CREATE POLICY "Form owners can view responses" ON public.form_responses_temp
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_responses_temp.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- 3. 폼 소유자는 자신의 폼 응답을 업데이트할 수 있음
CREATE POLICY "Form owners can update responses" ON public.form_responses_temp
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_responses_temp.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- 4. 폼 소유자는 자신의 폼 응답을 삭제할 수 있음
CREATE POLICY "Form owners can delete responses" ON public.form_responses_temp
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_responses_temp.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- processing_queue 테이블에 대한 정책도 수정
DROP POLICY IF EXISTS "Users can view own queue" ON public.processing_queue;

-- 처리 큐 정책 재생성
CREATE POLICY "Form owners can view queue" ON public.processing_queue
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_responses_temp r
      JOIN public.forms f ON r.form_id = f.id
      WHERE r.id = processing_queue.response_id
      AND f.user_id = auth.uid()
    )
  );

-- 누구나 처리 큐에 추가 가능 (응답 제출 시 자동으로 추가되므로)
CREATE POLICY "Anyone can insert to queue" ON public.processing_queue
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- 서비스 역할만 큐 업데이트/삭제 가능
CREATE POLICY "Service role can manage queue" ON public.processing_queue
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 권한 재부여
GRANT INSERT, SELECT ON public.form_responses_temp TO anon;
GRANT ALL ON public.form_responses_temp TO authenticated;
GRANT INSERT ON public.processing_queue TO anon;
GRANT ALL ON public.processing_queue TO authenticated;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'RLS policies for form_responses_temp have been fixed';
END $$;