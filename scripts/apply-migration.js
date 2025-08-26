const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applyMigration() {
  console.log('📦 Applying project_id migration to form_responses_temp table...\n')
  
  try {
    // SQL 쿼리를 직접 실행
    const migrationSQL = `
      -- form_responses_temp 테이블에 project_id 컬럼 추가 (이미 없는 경우에만)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'form_responses_temp' 
          AND column_name = 'project_id'
        ) THEN
          ALTER TABLE public.form_responses_temp 
          ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
          
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
          
          RAISE NOTICE 'project_id column added successfully';
        ELSE
          RAISE NOTICE 'project_id column already exists';
        END IF;
      END $$;
    `
    
    // rpc 함수를 사용하여 SQL 실행
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    }).single()
    
    if (error) {
      // rpc 함수가 없는 경우, 직접 실행 시도
      console.log('RPC function not found, trying alternative method...')
      
      // 테이블 구조 확인
      const { data: columns } = await supabase
        .from('form_responses_temp')
        .select('*')
        .limit(0)
      
      console.log('Current table structure check completed')
      
      // 수동으로 마이그레이션 SQL 출력
      console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:')
      console.log('=' . repeat(60))
      console.log(migrationSQL)
      console.log('=' . repeat(60))
      console.log('\nGo to: Supabase Dashboard > SQL Editor > New Query')
      console.log('Copy and paste the SQL above, then click "Run"')
      
      return
    }
    
    console.log('✅ Migration applied successfully!')
    
    // 검증
    const { data: testInsert, error: testError } = await supabase
      .from('form_responses_temp')
      .select('project_id')
      .limit(1)
    
    if (!testError) {
      console.log('✅ project_id column verified - migration successful!')
    } else {
      console.log('⚠️ Verification failed:', testError.message)
    }
    
  } catch (error) {
    console.error('Error applying migration:', error)
    
    // SQL 수동 실행 가이드
    console.log('\n📝 Manual Migration Required:')
    console.log('1. Go to Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Create a new query and paste the SQL from:')
    console.log('   supabase/migrations/20250827_add_project_id_to_responses.sql')
    console.log('4. Run the query')
  }
}

applyMigration().catch(console.error)