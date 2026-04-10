-- Queue hardening: updated_at, unique index, scheduling indexes

-- 1) form_responses_temp.updated_at 추가 및 트리거 연결
ALTER TABLE public.form_responses_temp 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_form_responses_updated_at'
  ) THEN
    CREATE TRIGGER update_form_responses_updated_at 
      BEFORE UPDATE ON public.form_responses_temp
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 2) processing_queue 고유 인덱스(중복 enqueue 방지)
CREATE UNIQUE INDEX IF NOT EXISTS uq_processing_queue_response_id 
ON public.processing_queue(response_id);

-- 3) 스케줄링/우선순위 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_processing_queue_next_retry_priority 
ON public.processing_queue(next_retry_at, priority);

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Queue hardening migration applied';
END $$;


