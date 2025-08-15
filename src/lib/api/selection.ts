export const selectionAPI = {
  async trigger(applicantId: string) {
    const res = await fetch(`/api/selection/${applicantId}/trigger`, { method: 'POST' })
    return res.json()
  },
}


