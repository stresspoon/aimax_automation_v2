import { Order } from '@/types/database'
import { fetchJSON } from '@/lib/httpClient'

const API_BASE = '/api/orders'

export const ordersAPI = {
  async list(params?: { 
    status?: string
    limit?: number
    offset?: number 
  }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    
    return fetchJSON<Order[]>(`${API_BASE}?${searchParams}`)
  },

  async get(id: string) {
    return fetchJSON<Order>(`${API_BASE}/${id}`)
  },

  async create(data: {
    items: any[]
    total_price: number
    payment_method?: string
    shipping_info?: Record<string, any>
  }) {
    return fetchJSON<Order>(API_BASE, { method: 'POST', body: data })
  },

  async update(id: string, data: {
    status?: string
    shipping_info?: Record<string, any>
    payment_method?: string
  }) {
    return fetchJSON<Order>(`${API_BASE}/${id}`, { method: 'PUT', body: data })
  },

  async delete(id: string) {
    return fetchJSON(`${API_BASE}/${id}`, { method: 'DELETE' })
  }
}
