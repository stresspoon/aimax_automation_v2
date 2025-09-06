import { Campaign } from '@/types/database'
import { fetchJSON } from '@/lib/httpClient'

const API_BASE = '/api/campaigns'

export const campaignsAPI = {
  async list(params?: { status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)

    return fetchJSON<Campaign[]>(`${API_BASE}?${searchParams}`)
  },

  async get(id: string) {
    return fetchJSON<Campaign>(`${API_BASE}/${id}`)
  },

  async create(data: { name: string; data?: Record<string, any> }) {
    return fetchJSON<Campaign>(API_BASE, { method: 'POST', body: data })
  },

  async update(id: string, data: Partial<Campaign>) {
    return fetchJSON<Campaign>(`${API_BASE}/${id}`, { method: 'PUT', body: data })
  },

  async delete(id: string) {
    return fetchJSON(`${API_BASE}/${id}`, { method: 'DELETE' })
  }
}
