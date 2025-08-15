import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

export function useCampaigns(status?: string) {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true)
      const response = await apiClient.getCampaigns(status)
      
      if (response.error) {
        setError(response.error)
      } else {
        setCampaigns(response.data || [])
      }
      
      setLoading(false)
    }

    fetchCampaigns()
  }, [status])

  return { campaigns, loading, error }
}

export function useProjects(campaignId?: string) {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true)
      const response = await apiClient.getProjects(campaignId)
      
      if (response.error) {
        setError(response.error)
      } else {
        setProjects(response.data || [])
      }
      
      setLoading(false)
    }

    fetchProjects()
  }, [campaignId])

  return { projects, loading, error }
}

export function useProfile() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const response = await apiClient.getProfile()
      
      if (response.error) {
        setError(response.error)
      } else {
        setProfile(response.data)
      }
      
      setLoading(false)
    }

    fetchProfile()
  }, [])

  const updateProfile = async (data: any) => {
    const response = await apiClient.updateProfile(data)
    if (!response.error) {
      setProfile(response.data)
    }
    return response
  }

  return { profile, loading, error, updateProfile }
}