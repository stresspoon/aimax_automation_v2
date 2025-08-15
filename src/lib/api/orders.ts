import { Order } from '@/types/database'

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
    
    const response = await fetch(`${API_BASE}?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch orders')
    return response.json() as Promise<Order[]>
  },

  async get(id: string) {
    const response = await fetch(`${API_BASE}/${id}`)
    if (!response.ok) throw new Error('Failed to fetch order')
    return response.json() as Promise<Order>
  },

  async create(data: {
    items: any[]
    total_price: number
    payment_method?: string
    shipping_info?: Record<string, any>
  }) {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to create order')
    return response.json() as Promise<Order>
  },

  async update(id: string, data: {
    status?: string
    shipping_info?: Record<string, any>
    payment_method?: string
  }) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update order')
    return response.json() as Promise<Order>
  },

  async delete(id: string) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete order')
    return response.json()
  }
}