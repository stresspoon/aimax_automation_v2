export interface Candidate {
  name: string
  email: string
  phone?: string
  threads?: number
  blog?: number
  instagram?: number
  status?: 'selected' | 'notSelected'
  checkStatus?: any
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
    }
  })
}

