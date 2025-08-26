const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixOrphanedForms() {
  console.log('🔧 고아 폼들을 프로젝트에 연결하는 작업 시작\n')
  
  // makefamilybrand@gmail.com 사용자 찾기
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const user = authUsers?.users?.find(u => u.email === 'makefamilybrand@gmail.com')
  const userId = user?.id
  
  if (!userId) {
    console.log('❌ 사용자를 찾을 수 없습니다.')
    return
  }
  
  console.log(`✅ 사용자: ${user.email} (${userId})\n`)
  
  // 1. project_id가 null인 폼들 조회
  const { data: orphanedForms } = await supabase
    .from('forms')
    .select('*')
    .is('project_id', null)
    .eq('user_id', userId)
  
  if (!orphanedForms || orphanedForms.length === 0) {
    console.log('✨ 연결되지 않은 폼이 없습니다.')
    return
  }
  
  console.log(`📋 ${orphanedForms.length}개의 연결되지 않은 폼 발견:\n`)
  
  // 2. 프로젝트 목록 조회
  const { data: projects } = await supabase
    .from('projects')
    .select('id, campaign_id, created_at, campaigns(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (!projects || projects.length === 0) {
    console.log('❌ 연결할 프로젝트가 없습니다.')
    return
  }
  
  console.log('🎯 사용 가능한 프로젝트:')
  projects.forEach((p, idx) => {
    console.log(`  ${idx + 1}. ${p.campaigns?.name || 'Unknown'} (${p.id})`)
  })
  
  // 3. 각 폼을 적절한 프로젝트에 연결
  for (const form of orphanedForms) {
    console.log(`\n🔗 폼 연결 중: "${form.title}"`)
    
    // 폼 제목에서 캠페인 이름 추출 시도
    let targetProject = null
    
    // AIMAX 관련 폼들은 AIMAX 프로젝트에 연결
    if (form.title.includes('AIMAX')) {
      targetProject = projects.find(p => p.campaigns?.name?.includes('AIMAX'))
    }
    
    // 매칭되는 프로젝트가 없으면 가장 최근 프로젝트 사용
    if (!targetProject) {
      targetProject = projects[0]
      console.log(`  ⚠️ 캠페인 이름 매칭 실패, 최신 프로젝트 사용: ${targetProject.campaigns?.name}`)
    } else {
      console.log(`  ✅ 매칭된 프로젝트: ${targetProject.campaigns?.name}`)
    }
    
    // 폼 업데이트
    const { error } = await supabase
      .from('forms')
      .update({ project_id: targetProject.id })
      .eq('id', form.id)
    
    if (error) {
      console.log(`  ❌ 업데이트 실패: ${error.message}`)
    } else {
      console.log(`  ✅ 성공적으로 연결됨`)
    }
  }
  
  // 4. 중복 폼 처리 (같은 제목의 폼이 여러 개 있는 경우)
  console.log('\n\n📊 중복 폼 확인 중...')
  
  const { data: allForms } = await supabase
    .from('forms')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  const titleGroups = {}
  allForms?.forEach(form => {
    if (!titleGroups[form.title]) {
      titleGroups[form.title] = []
    }
    titleGroups[form.title].push(form)
  })
  
  Object.keys(titleGroups).forEach(title => {
    const forms = titleGroups[title]
    if (forms.length > 1) {
      console.log(`\n⚠️ 중복 발견: "${title}" (${forms.length}개)`)
      forms.forEach(f => {
        console.log(`  - ID: ${f.id}, Project: ${f.project_id || 'NULL'}, Created: ${new Date(f.created_at).toLocaleDateString()}`)
      })
      
      // 가장 최신 것 제외하고 나머지는 비활성화 권장
      console.log(`  💡 권장: 가장 최신 폼 외 나머지는 비활성화 처리`)
    }
  })
  
  console.log('\n✅ 작업 완료!')
}

fixOrphanedForms().catch(console.error)