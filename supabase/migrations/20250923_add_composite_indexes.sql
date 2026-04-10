-- =============================================
-- 복합 인덱스 추가 (쿼리 패턴 기반 최적화)
-- =============================================

-- forms: slug + is_active 복합 인덱스 (공개 폼 조회 최적화)
-- 쿼리: .eq('slug', slug).eq('is_active', true)
CREATE INDEX IF NOT EXISTS idx_forms_slug_active
  ON public.forms(slug, is_active)
  WHERE is_active = true;

-- forms: user_id + project_id 복합 인덱스 (사용자 폼 목록 조회)
-- 쿼리: .eq('user_id', user.id).eq('project_id', projectId)
CREATE INDEX IF NOT EXISTS idx_forms_user_project
  ON public.forms(user_id, project_id);

-- form_responses_temp: form_id + email 복합 인덱스 (중복 체크)
-- 쿼리: .eq('form_id', formId).eq('email', email)
CREATE INDEX IF NOT EXISTS idx_responses_form_email
  ON public.form_responses_temp(form_id, email);

-- form_responses_temp: form_id + status + created_at 복합 인덱스 (응답 목록 필터링)
-- 쿼리: .in('form_id', formIds).eq('status', status).order('created_at')
CREATE INDEX IF NOT EXISTS idx_responses_form_status_created
  ON public.form_responses_temp(form_id, status, created_at DESC);

-- form_responses_temp: form_id + created_at 복합 인덱스 (정렬된 목록 조회)
-- 쿼리: .in('form_id', formIds).order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_responses_form_created
  ON public.form_responses_temp(form_id, created_at DESC);

-- projects: campaign_id + user_id + type 복합 인덱스 (중복 프로젝트 확인)
-- 쿼리: .eq('campaign_id', id).eq('user_id', id).eq('type', type)
CREATE INDEX IF NOT EXISTS idx_projects_campaign_user_type
  ON public.projects(campaign_id, user_id, type);

-- projects: user_id + created_at 복합 인덱스 (사용자 프로젝트 목록)
-- 쿼리: .eq('user_id', user.id).order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_projects_user_created
  ON public.projects(user_id, created_at DESC);

-- campaigns: user_id 인덱스 (이미 존재할 수 있지만 IF NOT EXISTS로 안전)
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id
  ON public.campaigns(user_id);

-- processing_queue: status + created_at 복합 인덱스 (대기열 처리 순서)
CREATE INDEX IF NOT EXISTS idx_queue_status_created
  ON public.processing_queue(status, created_at);
