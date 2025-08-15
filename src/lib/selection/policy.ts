import type { Metrics } from '@/lib/sns/scrape'

export interface SelectionInput {
  name: string
  email: string
  videoConsent: boolean
  privacyConsent: boolean
  metricsList: Metrics[]
}

export interface SelectionResult {
  selected: boolean
  reason: string
}

// Simple baseline policy:
// - 개인정보 동의, 영상 촬영 동의 필수
// - 인스타 팔로워 >= 1000 또는 네이버 이웃 >= 100 기준
export function evaluateSelection(input: SelectionInput): SelectionResult {
  if (!input.privacyConsent) return { selected: false, reason: '개인정보 미동의' }
  if (!input.videoConsent) return { selected: false, reason: '영상 촬영 미동의' }

  const ig = input.metricsList.find((m) => m.platform === 'instagram')
  const nb = input.metricsList.find((m) => m.platform === 'naver_blog')
  const igOk = (ig?.followers ?? 0) >= 1000
  const nbOk = (nb?.neighbors ?? 0) >= 100
  if (igOk || nbOk) return { selected: true, reason: 'SNS 영향력 기준 충족' }

  // Threads 등 기타는 현재 점수화 제외
  return { selected: false, reason: '기준 미충족' }
}


