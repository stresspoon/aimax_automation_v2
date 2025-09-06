import { Project } from '@/types/database'
import { fetchJSON } from '@/lib/httpClient'

const API_BASE = '/api/projects'

export const projectsAPI = {
  async list(params?: { campaign_id?: string; type?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.campaign_id) searchParams.append('campaign_id', params.campaign_id)
    if (params?.type) searchParams.append('type', params.type)

    return fetchJSON<Project[]>(`${API_BASE}?${searchParams}`)
  },

  async get(id: string) {
    return fetchJSON<Project>(`${API_BASE}/${id}`)
  },

  async create(data: {
    campaign_id: string
    type: 'customer_acquisition' | 'detail_page' | 'video'
    step?: number
    data?: Record<string, any>
  }) {
    return fetchJSON<Project>(API_BASE, { method: 'POST', body: data })
  },

  async update(id: string, data: Partial<Project>) {
    return fetchJSON<Project>(`${API_BASE}/${id}`, { method: 'PUT', body: data })
  },

  async delete(id: string) {
    return fetchJSON(`${API_BASE}/${id}`, { method: 'DELETE' })
  }
}
