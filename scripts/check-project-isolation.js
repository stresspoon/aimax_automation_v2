const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkProjectIsolation() {
  console.log('🔍 프로젝트별 데이터 격리 상태 확인\n')
  
  // 먼저 makefamilybrand@gmail.com 사용자 찾기
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  
  const user = authUsers?.users?.find(u => u.email === 'makefamilybrand@gmail.com')
  const userId = user?.id
  
  if (!userId) {
    console.log('❌ makefamilybrand@gmail.com 사용자를 찾을 수 없습니다.')
    
    // 모든 사용자 목록 출력
    console.log('\n등록된 사용자 목록:')
    authUsers?.users?.slice(0, 10).forEach(u => console.log(`  - ${u.email} (${u.id})`))
    return
  }
  
  console.log(`✅ 사용자 발견: ${user.email} (${userId})\n`)
  
  // 1. 사용자별 프로젝트 확인
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, campaign_id, user_id, created_at, campaigns(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (projectError) {
    console.error('프로젝트 조회 오류:', projectError)
    return
  }
  
  console.log(`📁 총 ${projects.length}개의 프로젝트 발견:`)
  projects.forEach(p => {
    console.log(`  - Project ID: ${p.id}`)
    console.log(`    Campaign: ${p.campaigns?.name || 'N/A'}`)
    console.log(`    Created: ${new Date(p.created_at).toLocaleDateString()}`)
  })
  
  console.log('\n')
  
  // 2. 각 프로젝트별 폼 확인
  for (const project of projects) {
    console.log(`\n📋 Project ${project.id}의 폼:`)
    
    const { data: forms } = await supabase
      .from('forms')
      .select('id, title, project_id, slug, created_at')
      .eq('project_id', project.id)
    
    if (forms && forms.length > 0) {
      forms.forEach(f => {
        console.log(`  - Form: ${f.title} (${f.id})`)
        console.log(`    Slug: ${f.slug}`)
        console.log(`    Project ID: ${f.project_id}`)
      })
    } else {
      console.log('  폼 없음')
    }
    
    // 3. 각 프로젝트별 응답 수 확인
    const { data: responses, count } = await supabase
      .from('form_responses_temp')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
    
    console.log(`  응답 수: ${count || 0}개`)
  }
  
  // 4. project_id가 null인 폼 확인
  console.log('\n⚠️  프로젝트가 연결되지 않은 폼:')
  const { data: nullForms } = await supabase
    .from('forms')
    .select('id, title, slug, created_at, user_id')
    .is('project_id', null)
    .eq('user_id', userId)
  
  if (nullForms && nullForms.length > 0) {
    nullForms.forEach(f => {
      console.log(`  - ${f.title} (${f.id})`)
      console.log(`    Slug: ${f.slug}`)
      console.log(`    Created: ${new Date(f.created_at).toLocaleDateString()}`)
    })
  } else {
    console.log('  없음')
  }
  
  // 5. project_id가 null인 응답 확인
  console.log('\n⚠️  프로젝트가 연결되지 않은 응답:')
  const { count: nullResponseCount } = await supabase
    .from('form_responses_temp')
    .select('id', { count: 'exact', head: true })
    .is('project_id', null)
  
  console.log(`  총 ${nullResponseCount || 0}개의 응답`)
  
  // 6. 중복 문제 분석
  console.log('\n🔍 중복 데이터 분석:')
  
  // 모든 폼 응답을 그룹화하여 중복 확인
  const { data: allResponses } = await supabase
    .from('form_responses_temp')
    .select('id, form_id, project_id, email, name, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  
  if (allResponses) {
    const emailGroups = {}
    allResponses.forEach(r => {
      if (!emailGroups[r.email]) {
        emailGroups[r.email] = []
      }
      emailGroups[r.email].push({
        id: r.id,
        project_id: r.project_id,
        form_id: r.form_id,
        created_at: r.created_at
      })
    })
    
    // 여러 프로젝트에 걸쳐 있는 이메일 찾기
    Object.keys(emailGroups).forEach(email => {
      const responses = emailGroups[email]
      if (responses.length > 1) {
        const projectIds = [...new Set(responses.map(r => r.project_id))]
        if (projectIds.length > 1) {
          console.log(`  ⚠️ ${email}이(가) ${projectIds.length}개의 다른 프로젝트에 존재:`)
          responses.forEach(r => {
            console.log(`    - Project: ${r.project_id || 'NULL'}, Form: ${r.form_id}`)
          })
        }
      }
    })
  }
}

checkProjectIsolation().catch(console.error)