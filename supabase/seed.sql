-- 초기 관리자 계정 시드 데이터
-- 주의: 이 파일은 개발 환경에서만 사용하세요. 프로덕션에서는 보안상 위험합니다.

-- 기본 관리자 계정 생성
-- 이메일: admin@aimax.kr
-- 비밀번호: Aimax2024Admin!
-- 
-- 중요: 첫 로그인 후 반드시 비밀번호를 변경하세요!

-- Supabase Auth를 통한 사용자 생성은 SQL로 직접 할 수 없으므로,
-- 아래 스크립트를 사용하거나 Supabase 대시보드에서 수동으로 생성해야 합니다.

-- 방법 1: Supabase 대시보드에서 수동 생성
-- 1. Supabase 대시보드 -> Authentication -> Users
-- 2. "Add User" 클릭
-- 3. 이메일: admin@aimax.kr
-- 4. 비밀번호: Aimax2024Admin!
-- 5. Auto Confirm User 체크

-- 방법 2: 스크립트를 통한 생성 (별도 실행 필요)
-- 아래 Node.js 스크립트를 사용하여 관리자 계정을 생성할 수 있습니다.

-- 기본 시스템 설정 추가
INSERT INTO public.system_settings (key, value) VALUES
    ('site_name', '"AIMAX"'),
    ('site_url', '"https://aimax.kr"'),
    ('admin_email', '"admin@aimax.kr"'),
    ('support_email', '"support@aimax.kr"'),
    ('maintenance_mode', 'false'),
    ('api_rate_limit', '1000'),
    ('session_timeout', '30'),
    ('auto_backup', 'true'),
    ('backup_schedule', '"daily"'),
    ('backup_retention_days', '30')
ON CONFLICT (key) DO NOTHING;