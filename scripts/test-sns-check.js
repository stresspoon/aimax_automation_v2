const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSNSCheck() {
  console.log('🔍 SNS 체크 기능 테스트\n')
  
  // 최근 응답 조회
  const { data: responses } = await supabase
    .from('form_responses_temp')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (!responses || responses.length === 0) {
    console.log('❌ 테스트할 응답 데이터가 없습니다.')
    return
  }
  
  console.log(`📊 ${responses.length}개 응답 발견:\n`)
  
  for (const response of responses) {
    console.log(`\n📝 응답 ID: ${response.id}`)
    console.log(`   이름: ${response.name}`)
    console.log(`   이메일: ${response.email}`)
    console.log(`   상태: ${response.status}`)
    console.log(`   SNS 체크 결과:`)
    
    if (response.sns_check_result) {
      const result = response.sns_check_result
      
      if (result.threads) {
        console.log(`   - 스레드: ${result.threads.followers || 0} 팔로워`)
        console.log(`     URL: ${result.threads.url || 'N/A'}`)
        console.log(`     체크됨: ${result.threads.checked ? '✅' : '❌'}`)
      }
      
      if (result.instagram) {
        console.log(`   - 인스타그램: ${result.instagram.followers || 0} 팔로워`)
        console.log(`     URL: ${result.instagram.url || 'N/A'}`)
        console.log(`     체크됨: ${result.instagram.checked ? '✅' : '❌'}`)
      }
      
      if (result.blog) {
        console.log(`   - 블로그: ${result.blog.neighbors || 0} 이웃`)
        console.log(`     URL: ${result.blog.url || 'N/A'}`)
        console.log(`     체크됨: ${result.blog.checked ? '✅' : '❌'}`)
      }
      
      if (result.custom && Object.keys(result.custom).length > 0) {
        console.log(`   - 커스텀 필드:`)
        for (const [key, value] of Object.entries(result.custom)) {
          console.log(`     ${key}: ${JSON.stringify(value)}`)
        }
      }
    } else {
      console.log(`   ❌ SNS 체크 결과 없음`)
    }
    
    console.log(`   선정 여부: ${response.is_selected === true ? '✅ 선정' : response.is_selected === false ? '❌ 탈락' : '⏳ 대기'}`)
  }
  
  // SNS URL이 있는데 체크 결과가 없는 응답 찾기
  console.log('\n\n🔍 SNS 체크 누락 확인:')
  
  const { data: allResponses } = await supabase
    .from('form_responses_temp')
    .select('id, data, sns_check_result, status')
    .limit(20)
  
  let missingCount = 0
  
  for (const response of allResponses || []) {
    const hasUrls = response.data?.threadsUrl || response.data?.instagramUrl || response.data?.blogUrl
    const hasResults = response.sns_check_result?.threads?.checked || 
                      response.sns_check_result?.instagram?.checked || 
                      response.sns_check_result?.blog?.checked
    
    if (hasUrls && !hasResults) {
      missingCount++
      console.log(`   ⚠️ ID ${response.id}: URL 있지만 체크 결과 없음 (상태: ${response.status})`)
    }
  }
  
  if (missingCount === 0) {
    console.log('   ✅ 모든 응답이 정상적으로 체크됨')
  } else {
    console.log(`   ⚠️ ${missingCount}개 응답에서 SNS 체크 누락`)
  }
}

testSNSCheck().catch(console.error)