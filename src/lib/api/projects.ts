import { Project } from '@/types/database'

const API_BASE = '/api/projects'

export const projectsAPI = {
  async list(params?: { campaign_id?: string; type?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.campaign_id) searchParams.append('campaign_id', params.campaign_id)
    if (params?.type) searchParams.append('type', params.type)
    
    const response = await fetch(`${API_BASE}?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch projects')
    return response.json() as Promise<Project[]>
  },

  async get(id: string) {
    const response = await fetch(`${API_BASE}/${id}`)
    if (!response.ok) throw new Error('Failed to fetch project')
    return response.json() as Promise<Project>
  },

  async create(data: {
    campaign_id: string
    type: 'customer_acquisition' | 'detail_page' | 'video'
    step?: number
    data?: Record<string, any>
  }) {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to create project')
    return response.json() as Promise<Project>
  },

  async update(id: string, data: Partial<Project>) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update project')
    return response.json() as Promise<Project>
  },

  async delete(id: string) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete project')
    return response.json()
  }
}