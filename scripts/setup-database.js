const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 환경 변수 로드
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  try {
    console.log('🚀 데이터베이스 테이블 생성 중...')
    
    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, 'create-forms-tables.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // SQL 실행
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // RPC가 없으면 수동으로 알림
      console.log('⚠️  자동 실행 실패. 수동으로 SQL을 실행해주세요:')
      console.log('1. Supabase Dashboard > SQL Editor 접속')
      console.log('2. scripts/create-forms-tables.sql 내용 복사')
      console.log('3. SQL Editor에 붙여넣고 Run 클릭')
      console.log('\n📄 SQL 파일 위치:', sqlPath)
    } else {
      console.log('✅ 테이블 생성 완료!')
    }
    
    // 테이블 확인
    const { data: forms } = await supabase.from('forms').select('count')
    if (forms !== null) {
      console.log('✅ forms 테이블 확인됨')
    }
    
    const { data: responses } = await supabase.from('form_responses_temp').select('count')
    if (responses !== null) {
      console.log('✅ form_responses_temp 테이블 확인됨')
    }
    
    const { data: queue } = await supabase.from('processing_queue').select('count')
    if (queue !== null) {
      console.log('✅ processing_queue 테이블 확인됨')
    }
    
    console.log('\n🎉 데이터베이스 설정 완료!')
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message)
    console.log('\n수동으로 SQL을 실행해주세요:')
    console.log('1. Supabase Dashboard > SQL Editor')
    console.log('2. scripts/create-forms-tables.sql 파일 내용 복사')
    console.log('3. 실행')
  }
}

setupDatabase()