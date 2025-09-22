const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function deactivateDuplicateForms() {
  console.log('🔧 중복 폼 비활성화 작업 시작\n')
  
  // makefamilybrand@gmail.com 사용자 찾기
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const user = authUsers?.users?.find(u => u.email === 'makefamilybrand@gmail.com')
  const userId = user?.id
  
  if (!userId) {
    console.log('❌ 사용자를 찾을 수 없습니다.')
    return
  }
  
  console.log(`✅ 사용자: ${user.email}\n`)
  
  // 모든 폼 조회 (잠금 플래그 포함)
  const { data: allForms } = await supabase
    .from('forms')
    .select('*, prevent_auto_deactivate')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  // 프로젝트별로 그룹화
  const projectGroups = {}
  allForms?.forEach(form => {
    const key = `${form.project_id || 'NULL'}_${form.title}`
    if (!projectGroups[key]) {
      projectGroups[key] = []
    }
    projectGroups[key].push(form)
  })
  
  let deactivatedCount = 0
  
  // 각 그룹에서 최신 것 제외하고 비활성화
  for (const [key, forms] of Object.entries(projectGroups)) {
    if (forms.length > 1) {
      const [projectId, title] = key.split('_')
      console.log(`\n📋 처리 중: "${title}" (Project: ${projectId})`)
      console.log(`  총 ${forms.length}개 폼 발견`)
      
      // created_at 기준으로 정렬 (최신 순)
      forms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      
      // 가장 최신 폼
      const latestForm = forms[0]
      console.log(`  ✅ 유지: ${latestForm.id} (${new Date(latestForm.created_at).toLocaleDateString()})`)
      
      // 나머지 폼들 비활성화 (잠금 폼은 건너뜀)
      for (let i = 1; i < forms.length; i++) {
        const form = forms[i]
        if (form.prevent_auto_deactivate) {
          console.log(`  ⛔ 보호됨(비활성화 건너뜀): ${form.id} (${new Date(form.created_at).toLocaleDateString()})`)
          continue
        }
        console.log(`  🔒 비활성화: ${form.id} (${new Date(form.created_at).toLocaleDateString()})`)
        
        const { error } = await supabase
          .from('forms')
          .update({ is_active: false })
          .eq('id', form.id)
        
        if (error) {
          console.log(`    ❌ 실패: ${error.message}`)
        } else {
          deactivatedCount++
          console.log(`    ✅ 성공`)
        }
      }
    }
  }
  
  console.log(`\n📊 결과: 총 ${deactivatedCount}개 폼 비활성화 완료`)
  
  // 최종 상태 확인
  console.log('\n📈 최종 활성 폼 상태:')
  
  const { data: activeForms } = await supabase
    .from('forms')
    .select('id, title, project_id, slug, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('project_id', { ascending: true })
  
  // 프로젝트별로 그룹화하여 출력
  const projectIds = [...new Set(activeForms?.map(f => f.project_id) || [])]
  
  for (const projectId of projectIds) {
    const projectForms = activeForms?.filter(f => f.project_id === projectId) || []
    
    // 프로젝트 정보 가져오기
    const { data: project } = await supabase
      .from('projects')
      .select('campaigns(name)')
      .eq('id', projectId)
      .single()
    
    console.log(`\n🎯 ${project?.campaigns?.name || 'Unknown Project'} (${projectId}):`)
    projectForms.forEach(f => {
      console.log(`  - ${f.title} (slug: ${f.slug})`)
    })
  }
  
  console.log('\n✅ 작업 완료!')
}

deactivateDuplicateForms().catch(console.error)