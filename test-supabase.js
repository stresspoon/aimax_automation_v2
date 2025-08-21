const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testUserCount() {
  console.log('Testing with Service Role Key...')
  
  // 1. user_profiles 테이블 전체 카운트
  const { count: profileCount, error: profileError, data: profileData } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact' })
  
  console.log('user_profiles count:', profileCount)
  console.log('user_profiles error:', profileError)
  console.log('user_profiles data:', profileData)
  
  // 2. auth.users 테이블 확인 (service role로만 가능)
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
  
  console.log('auth.users count:', authUsers?.users?.length)
  console.log('auth.users error:', authError)
  
  // 3. 사용자 이메일 목록
  if (profileData) {
    console.log('\nUser profiles:')
    profileData.forEach(user => {
      console.log(`- ${user.email} (${user.role}, ${user.plan})`)
    })
  }
}

testUserCount().catch(console.error)