import { Campaign } from '@/types/database'

const API_BASE = '/api/campaigns'

export const campaignsAPI = {
  async list(params?: { status?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    
    const response = await fetch(`${API_BASE}?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch campaigns')
    return response.json() as Promise<Campaign[]>
  },

  async get(id: string) {
    const response = await fetch(`${API_BASE}/${id}`)
    if (!response.ok) throw new Error('Failed to fetch campaign')
    return response.json() as Promise<Campaign>
  },

  async create(data: { name: string; data?: Record<string, any> }) {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to create campaign')
    return response.json() as Promise<Campaign>
  },

  async update(id: string, data: Partial<Campaign>) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update campaign')
    return response.json() as Promise<Campaign>
  },

  async delete(id: string) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete campaign')
    return response.json()
  }
}