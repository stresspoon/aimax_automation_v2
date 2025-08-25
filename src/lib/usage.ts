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
  
  // 사용자의 프로필 정보 조회 (구독 상태 및 무제한 권한 확인)
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('subscription_status, is_unlimited, unlimited_until')
    .eq('id', user.id)
    .single()
  
  // 프로필이 없으면 생성
  if (profileError && profileError.code === 'PGRST116') {
    await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email,
        subscription_status: 'free',
        created_at: new Date().toISOString()
      })
  }
  
  // 무제한 사용 권한 체크
  if (profile?.is_unlimited) {
    // unlimited_until이 설정되어 있으면 만료일 확인
    if (profile.unlimited_until) {
      const expiryDate = new Date(profile.unlimited_until)
      if (expiryDate < new Date()) {
        // 만료된 경우 무제한 권한 자동 해제
        await supabase
          .from('user_profiles')
          .update({ 
            is_unlimited: false,
            unlimited_until: null,
            unlimited_reason: null 
          })
          .eq('id', user.id)
      } else {
        // 아직 유효한 무제한 권한
        return {
          feature,
          limit: -1, // 무제한
          used: 0,
          remaining: -1
        }
      }
    } else {
      // 무기한 무제한 권한
      return {
        feature,
        limit: -1, // 무제한
        used: 0,
        remaining: -1
      }
    }
  }
  
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
  const { data: logs, error: logsError } = await supabase
    .from('usage_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('feature', feature)
    .gte('created_at', startOfMonth)
  
  // 테이블이 없거나 오류가 있으면 0으로 처리
  if (logsError) {
    console.warn('usage_logs 조회 오류:', logsError)
  }
  
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
    .from('user_profiles')
    .select('subscription_status, subscription_plan')
    .eq('id', user.id)
    .single()
  
  return profile
}