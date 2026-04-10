-- =============================================
-- 보안 & 성능 강화 마이그레이션
-- S4: system_settings RLS admin 전용
-- P6: RLS 정책 성능 최적화 ((select auth.uid()) 래핑)
-- P3: 추가 인덱스 (is_selected)
-- =============================================

-- =============================================
-- S4: system_settings - admin 전용 읽기로 변경
-- =============================================
DROP POLICY IF EXISTS "Anyone can read settings" ON public.system_settings;

CREATE POLICY "Only admins can read settings" ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
  );

-- Service role은 RLS 우회하므로 별도 정책 불필요

-- =============================================
-- P6: RLS 정책 성능 최적화
-- auth.uid() → (select auth.uid()) 래핑으로 함수 호출 1회로 캐싱
-- [security-rls-performance] 규칙: 대형 테이블에서 100x+ 성능 개선
-- =============================================

-- profiles 테이블
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- campaigns 테이블
DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;

CREATE POLICY "Users can view own campaigns" ON public.campaigns
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own campaigns" ON public.campaigns
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own campaigns" ON public.campaigns
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own campaigns" ON public.campaigns
  FOR DELETE USING ((select auth.uid()) = user_id);

-- projects 테이블
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING ((select auth.uid()) = user_id);

-- orders 테이블
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own orders" ON public.orders
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- tool_purchases 테이블
DROP POLICY IF EXISTS "Users can view own tool purchases" ON public.tool_purchases;
DROP POLICY IF EXISTS "Users can insert own tool purchases" ON public.tool_purchases;

CREATE POLICY "Users can view own tool purchases" ON public.tool_purchases
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own tool purchases" ON public.tool_purchases
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- =============================================
-- P3: 추가 인덱스 (기존 마이그레이션에 없는 것만)
-- =============================================

-- form_responses_temp: is_selected 필터링용 인덱스
CREATE INDEX IF NOT EXISTS idx_responses_form_selected
  ON public.form_responses_temp(form_id, is_selected);

-- form_responses_temp: 단독 created_at DESC 인덱스 (전체 정렬)
CREATE INDEX IF NOT EXISTS idx_responses_created_desc
  ON public.form_responses_temp(created_at DESC);
