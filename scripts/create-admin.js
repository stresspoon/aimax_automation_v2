/**
 * 관리자 계정 생성 스크립트
 * 사용법: node scripts/create-admin.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// 환경 변수 확인
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 .env.local에 설정하세요.')
  process.exit(1)
}

// Supabase Admin 클라이언트 생성 (Service Role Key 사용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// 기본 관리자 정보
const ADMIN_EMAIL = 'admin@aimax.kr'
const ADMIN_PASSWORD = 'Aimax2024Admin!'
const ADMIN_NAME = 'AIMAX Administrator'

async function createAdmin() {
  console.log('🚀 관리자 계정 생성 시작...')
  console.log('━'.repeat(50))
  
  try {
    // 1. 사용자 생성
    console.log('📧 이메일:', ADMIN_EMAIL)
    console.log('🔐 임시 비밀번호:', ADMIN_PASSWORD)
    console.log('')
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: ADMIN_NAME
      }
    })

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log('⚠️  관리자 계정이 이미 존재합니다.')
        
        // 기존 사용자의 역할을 관리자로 업데이트
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users?.users?.find(u => u.email === ADMIN_EMAIL)
        
        if (existingUser) {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ role: 'super_admin' })
            .eq('id', existingUser.id)
          
          if (!updateError) {
            console.log('✅ 기존 계정을 관리자 권한으로 업데이트했습니다.')
          }
        }
      } else {
        throw authError
      }
    } else {
      console.log('✅ 관리자 계정이 생성되었습니다!')
      
      // 2. user_profiles에 관리자 역할 설정
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          role: 'super_admin',
          full_name: ADMIN_NAME,
          plan: 'enterprise',
          status: 'active'
        })
        .eq('id', authData.user.id)

      if (profileError) {
        console.log('⚠️  프로필 업데이트 중 오류:', profileError.message)
      } else {
        console.log('✅ 관리자 권한이 설정되었습니다!')
      }
    }

    console.log('')
    console.log('━'.repeat(50))
    console.log('🎉 관리자 계정 설정 완료!')
    console.log('')
    console.log('📝 로그인 정보:')
    console.log('   이메일:', ADMIN_EMAIL)
    console.log('   비밀번호:', ADMIN_PASSWORD)
    console.log('')
    console.log('⚠️  중요: 첫 로그인 후 반드시 비밀번호를 변경하세요!')
    console.log('')
    console.log('🔗 관리자 페이지: http://localhost:3001/admin')
    console.log('━'.repeat(50))

  } catch (error) {
    console.error('❌ 오류 발생:', error.message)
    process.exit(1)
  }
}

// 스크립트 실행
createAdmin()