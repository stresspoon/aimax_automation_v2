import { createClient } from '@/lib/supabase/server'

export interface UsageLimit {
  feature: string
  limit: number
  used: number
  remaining: number
}

export async function checkUsageLimit(feature: string = 'content_generation'): Promise<UsageLimit> {
  const supabase = await createClient()
  
  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('인증이 필요합니다')
  }

  // 무료 플랜 제한
  const FREE_LIMIT = 3
  
  // 사용자의 프로필 정보 조회 (구독 상태 확인)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()
  
  // 유료 구독자는 무제한
  if (profile?.subscription_status === 'active' || profile?.subscription_status === 'premium') {
    return {
      feature,
      limit: -1, // 무제한
      used: 0,
      remaining: -1
    }
  }
  
  // 무료 사용자의 사용 횟수 확인
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  
  // usage_logs 테이블에서 이번 달 사용 횟수 조회
  const { data: logs } = await supabase
    .from('usage_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('feature', feature)
    .gte('created_at', startOfMonth)
  
  const used = logs?.length || 0
  const remaining = Math.max(0, FREE_LIMIT - used)
  
  return {
    feature,
    limit: FREE_LIMIT,
    used,
    remaining
  }
}

export async function incrementUsage(feature: string = 'content_generation'): Promise<boolean> {
  const supabase = await createClient()
  
  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('인증이 필요합니다')
  }
  
  // 사용 제한 확인
  const usage = await checkUsageLimit(feature)
  
  if (usage.limit !== -1 && usage.remaining <= 0) {
    throw new Error('무료 사용 횟수를 초과했습니다')
  }
  
  // 사용 로그 기록
  const { error } = await supabase
    .from('usage_logs')
    .insert({
      user_id: user.id,
      feature,
      metadata: {
        timestamp: new Date().toISOString()
      }
    })
  
  if (error) {
    console.error('사용 로그 기록 실패:', error)
    // 로그 기록 실패는 무시하고 계속 진행
  }
  
  return true
}

export async function getUserSubscriptionStatus() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return null
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_plan')
    .eq('id', user.id)
    .single()
  
  return profile
}