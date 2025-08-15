import { ToolPurchase } from '@/types/database'

const API_BASE = '/api/tool-purchases'

export const toolPurchasesAPI = {
  async list(params?: { 
    order_id?: string
    tool_id?: string
    limit?: number
    offset?: number 
  }) {
    const searchParams = new URLSearchParams()
    if (params?.order_id) searchParams.append('order_id', params.order_id)
    if (params?.tool_id) searchParams.append('tool_id', params.tool_id)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    
    const response = await fetch(`${API_BASE}?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch tool purchases')
    return response.json() as Promise<ToolPurchase[]>
  },

  async get(id: string) {
    const response = await fetch(`${API_BASE}/${id}`)
    if (!response.ok) throw new Error('Failed to fetch tool purchase')
    return response.json() as Promise<ToolPurchase>
  },

  async create(data: {
    order_id: string
    tool_id: string
    tool_name: string
    price: number
    quantity?: number
  }) {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to create tool purchase')
    return response.json() as Promise<ToolPurchase>
  },

  async delete(id: string) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete tool purchase')
    return response.json()
  }
}