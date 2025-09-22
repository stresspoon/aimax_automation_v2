-- Add prevent_auto_deactivate column to protect important forms from bulk deactivation
-- Date: 2025-09-22

BEGIN;

-- 1) Add column if not exists
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS prevent_auto_deactivate BOOLEAN NOT NULL DEFAULT false;

-- 2) Optional: Seed protection for known campaigns/titles that must not be auto-deactivated
--    Adjust this list as needed for production environment
UPDATE public.forms
SET prevent_auto_deactivate = true
WHERE title IN (
  '바르는 파라핀 체험단 모집',
  '바르는파라핀 체험단 신청서'
);

COMMIT;


