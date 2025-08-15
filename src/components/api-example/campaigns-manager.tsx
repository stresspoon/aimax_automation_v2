'use client'

import { useState, useEffect } from 'react'
import { campaignsAPI } from '@/lib/api'
import { Campaign } from '@/types/database'

export function CampaignsManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch campaigns on mount
  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await campaignsAPI.list()
      setCampaigns(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = async () => {
    try {
      const newCampaign = await campaignsAPI.create({
        name: `New Campaign ${Date.now()}`,
        data: {
          description: 'Campaign created via API example'
        }
      })
      setCampaigns([newCampaign, ...campaigns])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    }
  }

  const handleUpdateStatus = async (id: string, status: Campaign['status']) => {
    try {
      const updated = await campaignsAPI.update(id, { status })
      setCampaigns(campaigns.map(c => c.id === id ? updated : c))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    
    try {
      await campaignsAPI.delete(id)
      setCampaigns(campaigns.filter(c => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign')
    }
  }

  if (loading) return <div className="p-4">Loading campaigns...</div>
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Campaigns Manager</h2>
        <button
          onClick={handleCreateCampaign}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Campaign
        </button>
      </div>

      <div className="grid gap-4">
        {campaigns.map(campaign => (
          <div key={campaign.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{campaign.name}</h3>
                <p className="text-sm text-gray-600">
                  Status: <span className="font-medium">{campaign.status}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(campaign.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  value={campaign.status}
                  onChange={(e) => handleUpdateStatus(campaign.id, e.target.value as Campaign['status'])}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
                <button
                  onClick={() => handleDelete(campaign.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          No campaigns yet. Create your first campaign!
        </p>
      )}
    </div>
  )
}