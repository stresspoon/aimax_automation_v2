# AIMAX API Documentation

## Overview
This document describes the CRUD API endpoints implemented for the AIMAX v2 platform.

## Base URL
Development: `http://localhost:3001/api`

## Authentication
All endpoints require authentication via Supabase Auth. The user must be logged in to access any API endpoint.

## API Endpoints

### Campaigns

#### List Campaigns
```
GET /api/campaigns
Query Parameters:
  - status (optional): Filter by status (draft, active, paused, completed)
Response: Campaign[]
```

#### Get Single Campaign
```
GET /api/campaigns/[id]
Response: Campaign
```

#### Create Campaign
```
POST /api/campaigns
Body: {
  name: string
  data?: Record<string, any>
}
Response: Campaign
```

#### Update Campaign
```
PUT /api/campaigns/[id]
Body: Partial<Campaign>
Response: Campaign
```

#### Delete Campaign
```
DELETE /api/campaigns/[id]
Response: { message: string }
```

### Projects

#### List Projects
```
GET /api/projects
Query Parameters:
  - campaign_id (optional): Filter by campaign
  - type (optional): Filter by type (customer_acquisition, detail_page, video)
Response: Project[]
```

#### Get Single Project
```
GET /api/projects/[id]
Response: Project
```

#### Create Project
```
POST /api/projects
Body: {
  campaign_id: string
  type: 'customer_acquisition' | 'detail_page' | 'video'
  step?: number
  data?: Record<string, any>
}
Response: Project
```

#### Update Project
```
PUT /api/projects/[id]
Body: Partial<Project>
Response: Project
```

#### Delete Project
```
DELETE /api/projects/[id]
Response: { message: string }
```

### Orders

#### List Orders
```
GET /api/orders
Query Parameters:
  - status (optional): Filter by status
  - limit (optional): Number of results
  - offset (optional): Pagination offset
Response: Order[]
```

#### Get Single Order
```
GET /api/orders/[id]
Response: Order
```

#### Create Order
```
POST /api/orders
Body: {
  items: any[]
  total_price: number
  payment_method?: string
  shipping_info?: Record<string, any>
}
Response: Order
```

#### Update Order
```
PUT /api/orders/[id]
Body: {
  status?: string
  shipping_info?: Record<string, any>
  payment_method?: string
}
Response: Order
```

#### Delete Order
```
DELETE /api/orders/[id]
Note: Only pending orders can be deleted
Response: { message: string }
```

### Tool Purchases

#### List Tool Purchases
```
GET /api/tool-purchases
Query Parameters:
  - order_id (optional): Filter by order
  - tool_id (optional): Filter by tool
  - limit (optional): Number of results
  - offset (optional): Pagination offset
Response: ToolPurchase[]
```

#### Get Single Tool Purchase
```
GET /api/tool-purchases/[id]
Response: ToolPurchase
```

#### Create Tool Purchase
```
POST /api/tool-purchases
Body: {
  order_id: string
  tool_id: string
  tool_name: string
  price: number
  quantity?: number
}
Response: ToolPurchase
```

#### Delete Tool Purchase
```
DELETE /api/tool-purchases/[id]
Note: Only purchases for pending orders can be deleted
Response: { message: string }
```

## TypeScript Types

```typescript
interface Campaign {
  id: string
  user_id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  data: Record<string, any>
  created_at: string
  updated_at: string
}

interface Project {
  id: string
  campaign_id: string
  user_id: string
  type: 'customer_acquisition' | 'detail_page' | 'video'
  step: number
  data: Record<string, any>
  created_at: string
  updated_at: string
}

interface Order {
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

interface ToolPurchase {
  id: string
  user_id: string
  order_id: string
  tool_id: string
  tool_name: string
  price: number
  quantity: number
  created_at: string
}
```

## Client Library Usage

### Import the API clients
```typescript
import { campaignsAPI, projectsAPI, ordersAPI, toolPurchasesAPI } from '@/lib/api'
```

### Example Usage
```typescript
// List all campaigns
const campaigns = await campaignsAPI.list()

// Create a new campaign
const newCampaign = await campaignsAPI.create({
  name: "Summer Sale Campaign",
  data: { budget: 5000 }
})

// Update campaign status
const updated = await campaignsAPI.update(campaignId, {
  status: 'active'
})

// Create a project for a campaign
const project = await projectsAPI.create({
  campaign_id: campaignId,
  type: 'customer_acquisition',
  step: 1,
  data: { target_audience: 'millennials' }
})
```

## Testing
Visit `/api-test` in your browser to access the API testing dashboard with a visual interface for testing all endpoints.

## Error Handling
All endpoints return appropriate HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

Error responses follow this format:
```json
{
  "error": "Error message"
}
```