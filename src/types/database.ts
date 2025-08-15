export interface Profile {
  id: string
  email: string
  name?: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  user_id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  data: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  campaign_id: string
  user_id: string
  type: 'customer_acquisition' | 'detail_page' | 'video'
  step: number
  data: Record<string, any>
  created_at: string
  updated_at: string
  campaigns?: {
    name: string
    status: string
  }
}

export interface Order {
  id: string
  user_id: string
  order_number: string
  items: any[]
  total_price: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'
  payment_method?: string
  shipping_info?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ToolPurchase {
  id: string
  user_id: string
  order_id: string
  tool_id: string
  tool_name: string
  price: number
  quantity: number
  created_at: string
}