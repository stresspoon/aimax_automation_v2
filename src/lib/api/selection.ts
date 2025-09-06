import { fetchJSON } from '@/lib/httpClient'

export const selectionAPI = {
  async trigger(applicantId: string) {
    return fetchJSON(`/api/selection/${applicantId}/trigger`, { method: 'POST' })
  },
}

