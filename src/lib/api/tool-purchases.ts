import { ToolPurchase } from '@/types/database'
import { fetchJSON } from '@/lib/httpClient'

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
    
    return fetchJSON<ToolPurchase[]>(`${API_BASE}?${searchParams}`)
  },

  async get(id: string) {
    return fetchJSON<ToolPurchase>(`${API_BASE}/${id}`)
  },

  async create(data: {
    order_id: string
    tool_id: string
    tool_name: string
    price: number
    quantity?: number
  }) {
    return fetchJSON<ToolPurchase>(API_BASE, { method: 'POST', body: data })
  },

  async delete(id: string) {
    return fetchJSON(`${API_BASE}/${id}`, { method: 'DELETE' })
  }
}
