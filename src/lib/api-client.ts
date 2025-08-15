// API Client for frontend usage

const API_BASE = '/api'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
}

class ApiClient {
  private async request<T = any>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || 'An error occurred' }
      }

      return { data }
    } catch {
      return { error: 'Network error' }
    }
  }

  // User Profile
  async getProfile() {
    return this.request('/users/profile')
  }

  async updateProfile(data: any) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Campaigns
  async getCampaigns(status?: string) {
    const query = status ? `?status=${status}` : ''
    return this.request(`/campaigns${query}`)
  }

  async getCampaign(id: string) {
    return this.request(`/campaigns/${id}`)
  }

  async createCampaign(data: any) {
    return this.request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCampaign(id: string, data: any) {
    return this.request(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteCampaign(id: string) {
    return this.request(`/campaigns/${id}`, {
      method: 'DELETE',
    })
  }

  // Projects
  async getProjects(campaignId?: string) {
    const query = campaignId ? `?campaign_id=${campaignId}` : ''
    return this.request(`/projects${query}`)
  }

  async getProject(id: string) {
    return this.request(`/projects/${id}`)
  }

  async createProject(data: any) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProject(id: string, data: any) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()