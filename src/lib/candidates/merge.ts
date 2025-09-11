export interface Candidate {
  name: string
  email: string
  phone?: string
  threads?: number
  blog?: number
  instagram?: number
  status?: 'selected' | 'notSelected'
  checkStatus?: any
  emailSent?: boolean
  emailSentAt?: string | null
  // 수동 상태 고정 여부(자동 재계산 무시)
  statusManual?: boolean
  // 응답 생성 시각(기간 필터용)
  createdAt?: string | null
}

// 새 값이 0이면 기존 값을 보존하며 병합
export function mergeCandidatesSafely(prevList: Candidate[] = [], nextList: Candidate[] = []): Candidate[] {
  return (nextList || []).map((n: Candidate) => {
    const ex = (prevList || []).find((p: Candidate) => p.email === n.email && p.name === n.name)
    if (!ex) return n
    return {
      ...n,
      threads: (n.threads && n.threads > 0) ? n.threads : (ex.threads || 0),
      blog: (n.blog && n.blog > 0) ? n.blog : (ex.blog || 0),
      instagram: (n.instagram && n.instagram > 0) ? n.instagram : (ex.instagram || 0),
      status: ex.status || n.status,
      checkStatus: ex.checkStatus || n.checkStatus,
      statusManual: ex.statusManual || n.statusManual,
      createdAt: n.createdAt || ex.createdAt || null,
      // 이메일 발송 표시는 신뢰도 높은 값 우선
      emailSent: (n.emailSent === true) || (ex.emailSent === true) || Boolean(n.emailSentAt || ex.emailSentAt),
      emailSentAt: n.emailSentAt || ex.emailSentAt || null,
    }
  })
}
